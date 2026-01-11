import { expect } from "chai";
import hre from "hardhat";

const { ethers, network } = hre;

describe("FlashLoan", function () {
  const POOL_ADDRESS_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";
  const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const BINANCE_ADDRESS = "0x28C6c06298d514Db089934071355E5743bf21d60";

  it("Should execute a flash loan and repay it", async function () {

    // --- DEBUG START ---
    const blockNum = await ethers.provider.getBlockNumber();
    console.log("Bloco atual:", blockNum);
    
    const code = await ethers.provider.getCode(POOL_ADDRESS_PROVIDER);
    console.log("Tem código no endereço da Aave?", code !== "0x");
    // --- DEBUG END ---
    // Deploy FlashLoan contract
    const FlashLoan = await ethers.getContractFactory("FlashLoan");
    const flashLoanContract = await FlashLoan.deploy(POOL_ADDRESS_PROVIDER);
    await flashLoanContract.waitForDeployment();
    
    const contractAddress = await flashLoanContract.getAddress();
    console.log("FlashLoan contract deployed at:", contractAddress);

    // Impersonate Binance account
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [BINANCE_ADDRESS],
    });
    
    const binanceSigner = await ethers.getSigner(BINANCE_ADDRESS);
    const daiContract = await ethers.getContractAt("IERC20", DAI_ADDRESS);

    // Fund contract with DAI for fees
    const amountTax = ethers.parseUnits("1000", 18);
    await daiContract
      .connect(binanceSigner)
      .transfer(contractAddress, amountTax);

    console.log("Funded FlashLoan contract with 1000 DAI for repayment.");

    // Execute flash loan
    const amountToBorrow = ethers.parseUnits("1000", 18);
    console.log("Requesting flash loan...");

    const tx = await flashLoanContract.requestFlashLoan(
      DAI_ADDRESS,
      amountToBorrow
    );
    const receipt = await tx.wait();

    console.log(
      "Flash loan executed and repaid successfully. Transaction Hash:",
      receipt?.hash
    );

    // Verify the flash loan was successful
    expect(receipt?.status).to.equal(1);
  });
});
