const { assert, expect } = require("chai")
const {getNamedAccounts, network, deployments, ethers} = require("hardhat")
const { resolveConfig } = require("prettier")
const {developmentChains, networkConfig} = require("../../helper-hardhat-config")

!developmentChains.includes(network.name) 
    ? describe.skip 
    : describe ("Raffle unit tests", function () {
        let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval
        const chainId = network.config.chainId

        beforeEach (async function () {
            deployer = (await getNamedAccounts()).deployer
            await deployments.fixture(["all"])
            raffle = await ethers.getContract("Raffle", deployer)
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
            raffleEntranceFee = await raffle.getEntranceFee()
            interval = await raffle.getInterval()
        })

        describe ("constructor", function () {
            it ("initializes the constructor correctly", async function () {
                const raffleState = await raffle.getRaffleState()
                const interval = await raffle.getInterval()
                assert.equal(raffleState.toString(), "0")
                assert.equal(interval.toString(), networkConfig[chainId]["interval"])
            })
        })

        describe ("enterRaffle", function () {
            it ("reverts if not recieved enough ETH", async function () {
                await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETH")
            })

            it ("records player when they enter", async function () {
                await raffle.enterRaffle({value: raffleEntranceFee})
                const playerFromContract = await raffle.getPlayer(0)
                assert.equal(playerFromContract, deployer)
            })

            it ("emits an event", async function () {
                await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.emit(raffle, "RaffleEnter")
            })

            it ("doesn't allow entrance when raffle is calculating", async function () {
                await raffle.enterRaffle({value: raffleEntranceFee})
                // await network.provider.request({
                //     method: "evm_increaseTime",
                //     params: [interval.toNumber() + 1]
                // })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine", [])
                await raffle.performUpkeep([])
                await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.be.revertedWith("Raffle__NotOpen")
            })

        })

        describe ("checkUpkeep", function () {
            it ("returns false it no ETH is send", async function () {
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine", [])
                const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([])
                assert(!upkeepNeeded)
            })
            it ("returns false if raffle is not open", async function () {
                await raffle.enterRaffle({value: raffleEntranceFee})
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine", [])
                await raffle.performUpkeep([])
                const raffleState = await raffle.getRaffleState()
                const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([])
                assert.equal(raffleState.toString(), "1")
                assert.equal(upkeepNeeded, false)
            })
            it("returns false if enough time hasn't passed", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() - 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                assert(!upkeepNeeded)
            })
            it("returns true if enough time has passed, has players, ETH, and is open", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                assert(upkeepNeeded)
            })
        })

        describe ("performUpkeep", function () {
            it ("can only run if checkUpkeep returns true", async function () {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const tx = await raffle.performUpkeep([])
                assert(tx)
            })
            it ("reverts when checkUpkeep is false", async function () {
                await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpkeepNotNeeded")
            })
            it ("emits and event, changes the raffleState and calls vrfCoordinator", async function () {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const txResponse = await raffle.performUpkeep([])
                const txReceipt = await txResponse.wait(1)
                const requestId = await txReceipt.events[1].args.requestId
                const raffleState = await raffle.getRaffleState()
                assert(requestId.toNumber() > 0)
                assert(raffleState.toString() == "1")
            })
        })

        describe ("fulfillRandomWords", function () {
            beforeEach (async function () {
                await raffle.enterRaffle({value: raffleEntranceFee})
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine", [])
            })

            it ("can only be called after proformUpkeep", async function () {
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be.revertedWith("nonexistent request")
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)).to.be.revertedWith("nonexistent request")
            })

            it ("picks a winner, reset the lottery and sends money", async function () {
                const additionalEntrants = 3
                const startingAccountIndex = 1
                const accounts = await ethers.getSigners()

                for (let i=startingAccountIndex; i<startingAccountIndex + additionalEntrants; i++) {
                    const accountConnectedRaffle = raffle.connect(accounts[i])
                    await raffle.enterRaffle({value: raffleEntranceFee})
                }

                const startingTimeStamp = await raffle.getLatestTimeStamp()
                let recentWinnerIndex

                new Promise (async (resolve, reject) => {
                    raffle.once("WinnerPicked", async () => {
                        try {
                            const recentWinner = await raffle.getRecentWinner()
                            for (let i=0; i<accounts.length; i++) {
                                if (recentWinner.address === accounts[i].address) {
                                    recentWinnerIndex = i
                                    break
                                }
                            }
                            const endingTimeStamp = await raffle.getLatestTimeStamp()
                            const numPlayers = await raffle.getNumOfPlayers()
                            const raffleState = await raffle.getRaffleState()
                            const winnerEndingBalance = await accounts[recentWinnerIndex].getBalance()
                            assert.equal(numPlayers.toString(), "0")
                            assert.equal(raffleState.toString(), "0")
                            assert(startingTimeStamp < endingTimeStamp)
                            assert.equal(
                                winnerEndingBalance.toString(),
                                winnerStartingBalance.add(
                                    raffleEntranceFee.mul(additionalEntrants)
                                    .add(raffleEntranceFee)
                                    .toString()
                                )
                            )
                        } catch (e) {
                            console.log(e)
                        }
                        resolve()
                    })
                    const tx = await raffle.performUpkeep([])
                    const txReceipt = await tx.wait(1)
                    const winnerStartingBalance = await accounts[recentWinnerIndex].getBalance()
                    await vrfCoordinatorV2Mock.fulfillRandomWords(
                        txReceipt.events[1].args.requestId, raffle.address
                    )
                })
            })
        })
    })