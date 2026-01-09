import hre from "hardhat";

async function main() {
  const { ethers, network } = hre;
  console.log("Testing FlashLoan contract...\n");

  const POOL_ADDRESS_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";
  const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const BINANCE_ADDRESS = "0x28C6c06298d514Db089934071355E5743bf21d60";

  // Deploy FlashLoan contract
  console.log("Deploying FlashLoan contract...");
  const FlashLoan = await ethers.getContractFactory("FlashLoan");
  const flashLoanContract = await FlashLoan.deploy(POOL_ADDRESS_PROVIDER);
  await flashLoanContract.waitForDeployment();

  const contractAddress = await flashLoanContract.getAddress();
  console.log(`✓ FlashLoan deployed at: ${contractAddress}\n`);

  // Impersonate Binance account
  console.log("Impersonating Binance account...");
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [BINANCE_ADDRESS],
  });
  const binanceSigner = await ethers.getSigner(BINANCE_ADDRESS);
  const daiContract = await ethers.getContractAt("IERC20", DAI_ADDRESS);
  console.log("✓ Binance account impersonated\n");

  // Fund contract with DAI for fees
  console.log("Funding contract with DAI for flash loan fees...");
  const amountTax = ethers.parseUnits("1000", 18);
  const tx1 = await daiContract
    .connect(binanceSigner)
    .transfer(contractAddress, amountTax);
  await tx1.wait();
  console.log("✓ Contract funded with 1000 DAI\n");

  // Check DAI balance
  const balance = await daiContract.balanceOf(contractAddress);
  console.log(
    `Contract DAI balance: ${ethers.formatUnits(balance, 18)} DAI\n`,
  );

  // Execute flash loan
  console.log("Requesting flash loan for 1000 DAI...");
  const amountToBorrow = ethers.parseUnits("1000", 18);
  const tx2 = await flashLoanContract.requestFlashLoan(
    DAI_ADDRESS,
    amountToBorrow,
  );
  const receipt = await tx2.wait();

  console.log("✓ Flash loan executed successfully!");
  console.log(`Transaction hash: ${receipt.hash}\n`);

  // Check final balance
  const finalBalance = await daiContract.balanceOf(contractAddress);
  console.log(
    `Final contract DAI balance: ${ethers.formatUnits(finalBalance, 18)} DAI`,
  );
  console.log(
    `Fees paid: ${ethers.formatUnits(balance - finalBalance, 18)} DAI\n`,
  );

  console.log("✓ Test completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
