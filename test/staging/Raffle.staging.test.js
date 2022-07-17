const { assert } = require("chai");
const { splitSignature } = require("ethers/lib/utils");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
    ? describe.skip()
    :   describe ("Raffle Staging Test", function () {
    let raffle, raffleEntranceFee, deployer

    beforeEach (async function () {
        deployer = (await getNamedAccounts()).deployer
        raffle = await ethers.getContract("Raffle", deployer)
        raffleEntranceFee = await raffle.getEntranceFee()
    })

    describe ("fulfillRandomWords", function () {
        it ("it works with live Chainlink-Keepers, Chainlink-VRF", async () => {
            const startingTimeStamp = await raffle.getLatestTimeStamp()
            const accounts = await ethers.getSigners()
            await raffle.once("WinnerPicked", async (resolve, reject) => {
                try {
                    const recentWinner = await raffle.getRecentWinner()
                    const raffleState = await raffle.getRaffleState()
                    const winnerEndingBalance = await accounts[0].getBalance()
                    const endingTimeStamp = await raffle.getLatestTimeStamp()

                    await expect(raffle.getPlayer(0)).to.be.reverted
                    assert.equal(recentWinner.toString(), accounts[0].address)
                    assert.equal(raffleState, 0)
                    assert.equal(winnerStartingBalance.toString(), winnerEndingBalance.add(raffleEntranceFee).toString())
                    assert(endingTimeStamp > startingTimeStamp)
                    resolve()
                } catch (e) {
                    console.log("e")
                    reject(e)
                }
            })
            await raffle.enterRaffle({value: raffleEntranceFee})
            const winnerStartingBalance = await accounts[0].getBalance()
        })
    })
})