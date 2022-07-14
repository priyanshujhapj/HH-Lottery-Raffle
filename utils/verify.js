const {run} = require("hardhat")

const verify = async (contractAddress, args) => {

    try {
        await run ("verify:verify", {
            address: contractAddress,
            contructorArguments: args,
        })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already Verified")
        } else {
            console.log(e)
        }
    }
}

module.exports = {verify}