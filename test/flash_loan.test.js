const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("FlashLoan", async function () {
    let flashLoanContract;
    // let token;
    const POOL_ADDRESS_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e"; // Aave PoolAddressesProvider on Ethereum Mainnet
    const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // DAI token address on Ethereum Mainnet
    const BINANCE_ADDRESS = "0x28C6c06298d514Db089934071355E5743bf21d60";
    
    // const amountTax = ethers.parseUnits("1000", 18); // 1000 DAI

    // const binanceAddress = "0x28C6c06298d514Db089934071355E5743bf21d60";
    // await network.provider.request({
    // method: "hardhat_impersonateAccount",
    // params: [binanceAddress],
    // });
    // const binanceSigner = await ethers.getSigner(binanceAddress);
    // const daiContract = await ethers.getContractAt("IERC20", DAI_ADDRESS);

    // Transfere para o seu contrato de Flash Loan
    // await daiContract.connect(binanceSigner).transfer(flashLoanContract.target, amountTax);

    it("Should execute a flash loan and repay it", async function () {
    // Deploy FlashLoan contract
        const FlashLoan = await ethers.getContractFactory("FlashLoan");
        flashLoanContract = await FlashLoan.deploy(POOL_ADDRESS_PROVIDER);
        await flashLoanContract.waitForDeployment();

        const contractAddress = await flashLoanContract.getAddress();
        console.log("FlashLoan contract deployed at:", contractAddress);

        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [BINANCE_ADDRESS],
        });
        const binanceSigner = await ethers.getSigner(BINANCE_ADDRESS);
        const daiContract = await ethers.getContractAt("IERC20", DAI_ADDRESS);

        const amountTax = ethers.parseUnits("1000", 18); // 1000 DAI
        await daiContract.connect(binanceSigner).transfer(contractAddress, amountTax);
        
        console.log("Funded FlashLoan contract with 1000 DAI for repayment.");
        
        // Execute flash loan
        const amountToBorrow = ethers.parseUnits("1000", 18); // Borrow 1000 DAI
        console.log("Requesting flash loan...");

        const tx = await flashLoanContract.requestFlashLoan(DAI_ADDRESS, amountToBorrow);
        const receipt = await tx.wait();

        console.log("Flash loan executed and repaid successfully. Transaction Hash:", receipt.transactionHash);
    });
});