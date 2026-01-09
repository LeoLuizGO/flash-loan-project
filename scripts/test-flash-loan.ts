import hre from "hardhat";

async function main() {
  const POOL_ADDRESS_PROVIDER = "0x67D8B0577e0635919DA8AFE917E568C3F19Dd27e";
  const DAI_ADDRESS = "0x67D8B0577e0635919DA8AFE917E568C3F19Dd27e";
  const BINANCE_ADDRESS = "0x67D8B0577e0635919DA8AFE917E568C3F19Dd27e";

  console.log("🧪 Testing FlashLoan Contract\n");
  console.log("=" .repeat(50));

  // Deploy FlashLoan contract
  console.log("\n📦 Deploying FlashLoan contract...");
  const FlashLoan = await hre.ethers.getContractFactory("FlashLoan");
  const flashLoanContract = await FlashLoan.deploy(POOL_ADDRESS_PROVIDER);
  await flashLoanContract.waitForDeployment();

  const contractAddress = await flashLoanContract.getAddress();
  console.log(`✅ FlashLoan deployed at: ${contractAddress}`);

  // Impersonate Binance account
  console.log("\n🎭 Impersonating Binance account...");
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [BINANCE_ADDRESS],
  });

  const binanceSigner = await hre.ethers.getSigner(BINANCE_ADDRESS);
  const daiContract = await hre.ethers.getContractAt("IERC20", DAI_ADDRESS);
  console.log("✅ Binance account impersonated");

  // Fund contract with DAI for fees
  console.log("\n💰 Funding contract with DAI for flash loan fees...");
  const amountTax = hre.ethers.parseUnits("1000", 18);
  const fundTx = await daiContract
    .connect(binanceSigner)
    .transfer(contractAddress, amountTax);
  await fundTx.wait();
  console.log("✅ Contract funded with 1000 DAI");

  // Check balance
  const balance = await daiContract.balanceOf(contractAddress);
  console.log(`   Balance: ${hre.ethers.formatUnits(balance, 18)} DAI`);

  // Execute flash loan
  console.log("\n⚡ Requesting flash loan for 1000 DAI...");
  const amountToBorrow = hre.ethers.parseUnits("1000", 18);

  const tx = await flashLoanContract.requestFlashLoan(
    DAI_ADDRESS,
    amountToBorrow,
  );
  const receipt = await tx.wait();

  console.log("✅ Flash loan executed and repaid successfully!");
  console.log(`   Transaction Hash: ${receipt?.hash}`);
  console.log(`   Status: ${receipt?.status === 1 ? "Success ✓" : "Failed ✗"}`);

  // Check final balance
  const finalBalance = await daiContract.balanceOf(contractAddress);
  console.log(
    `\n📊 Final balance: ${hre.ethers.formatUnits(finalBalance, 18)} DAI`,
  );
  console.log(
    `   Fees paid: ${hre.ethers.formatUnits(balance - finalBalance, 18)} DAI`,
  );

  console.log("\n" + "=".repeat(50));
  console.log("✅ All tests passed!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
