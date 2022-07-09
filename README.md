# HARDHAT LOTTERY SMART-CONTRACT

### Introduction
This smart contract randomly picks a winner for the lottery, for the funders who participated by funding the contract. Verifiable randomness is achived through `Chainlink Oracles`

### Fundamentals
* The funders will be able to participate in the raffle by funding the contract
* The contract picks a verified random winner
* Winner is picked in a regular interval of time
* Chainlink Oracle is used for Verified Randomness and Automated Execution

### Getting Started
clone this repo
```
yarn
```


### How to use
```
yarn hardhat run scripts/deploy.js
```