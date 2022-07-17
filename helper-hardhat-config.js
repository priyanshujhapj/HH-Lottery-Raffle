const { ethers } = require("hardhat")

const networkConfig = {
    // 4: {
    //     name: "rinkeby",
    //     vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
    //     entranceFee: ethers.utils.parseEther("100000000000000000"),
    //     gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    //     subscriptionId: "8174",
    //     callbackGasLimit: "500000",
    //     interval: "30"
    // },
    4: {
        name: "rinkeby",
        subscriptionId: "8174",
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
        keepersUpdateInterval: "30",
        raffleEntranceFee: ethers.utils.parseEther("0.11"), //"100000000000000000", // 0.1 ETH
        callbackGasLimit: "500000", // 500,000 gas
        vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
    },
    31337: {
        name: "hardhat",
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        callbackGasLimit: "500000",
        interval: "30"
    }
}

const developmentChains = ["hardhat", "localhost"]
const VERIFICATION_BLOCK_CONFIRMATIONS = 6

module.exports = {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS
}