const { assert, expect } = require("chai")
const {getNamedAccounts, network, deployments, ethers} = require("hardhat")
const {developmentChains, networkConfig} = require("../../helper-hardhat-config")

!developmentChains.includes(network.name) 
    ? describe.skip 
    : describe ("Raffle unit tests", async function () {
        let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer
        const chainId = network.config.chainId

        beforeEach (async function () {
            deployer = (await getNamedAccounts()).deployer
            await deployments.fixture(["all"])
            raffle = await ethers.getContract("Raffle", deployer)
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
            raffleEntranceFee = await raffle.getEntranceFee()
        })

        describe ("constructor", async function () {
            it ("initializes the constructor correctly", async function () {
                const raffleState = await raffle.getRaffleState()
                const interval = await raffle.getInterval()
                assert.equal(raffleState.toString(), "0")
                assert.equal(interval.toString(), networkConfig[chainId]["interval"])
            })
        })

        describe ("enterRaffle", async function () {
            it ("reverts if not recieved enough ETH", async function () {
                await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETH")
            })

            it ("records player when they enter", async function () {
                await raffle.enterRaffle({value: raffleEntranceFee})
                const playerFromContract = await raffle.getPlayer(0)
                assert.equal(playerFromContract, deployer)
            })

        })
    })