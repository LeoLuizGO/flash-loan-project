const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("           CHECKING CONTRACT AND WALLET BALANCES");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Read deployment addresses
  const deploymentPath = path.join(__dirname, '..', 'deployment.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  const flashLoanAddress = deployment.contracts.flashLoan;
  const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  // Get signer (account #0)
  const [signer] = await hre.ethers.getSigners();
  console.log("📍 Checking balances for wallet:", signer.address);
  console.log("📍 FlashLoan Contract:", flashLoanAddress);
  console.log("\n");

  // Get token contracts
  const dai = await hre.ethers.getContractAt("IERC20", daiAddress);
  const weth = await hre.ethers.getContractAt("IERC20", wethAddress);

  // Check contract balances
  const contractDaiBalance = await dai.balanceOf(flashLoanAddress);
  const contractWethBalance = await weth.balanceOf(flashLoanAddress);

  console.log("💰 CONTRACT BALANCES:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("DAI:  ", hre.ethers.formatUnits(contractDaiBalance, 18), "DAI");
  console.log("WETH: ", hre.ethers.formatUnits(contractWethBalance, 18), "WETH");
  console.log("\n");

  // Check wallet balances
  const walletDaiBalance = await dai.balanceOf(signer.address);
  const walletWethBalance = await weth.balanceOf(signer.address);
  const walletEthBalance = await hre.ethers.provider.getBalance(signer.address);

  console.log("👛 WALLET BALANCES (", signer.address, "):");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("ETH:  ", hre.ethers.formatEther(walletEthBalance), "ETH");
  console.log("DAI:  ", hre.ethers.formatUnits(walletDaiBalance, 18), "DAI");
  console.log("WETH: ", hre.ethers.formatUnits(walletWethBalance, 18), "WETH");
  console.log("\n");

  // Check if there are profits to withdraw
  const hasProfit = contractDaiBalance > 0 || contractWethBalance > 0;

  if (hasProfit) {
    console.log("✅ CONTRACT HAS PROFITS TO WITHDRAW!");
    console.log("\n💡 To withdraw, use:");
    console.log("   npx hardhat run scripts/withdraw.js --network localhost");
  } else {
    console.log("⚠️  CONTRACT HAS NO PROFITS YET");
    console.log("\n💡 Execute a profitable flash loan first:");
    console.log("   1. Run: npx hardhat run scripts/create-arbitrage.js --network localhost");
    console.log("   2. Then execute a flash loan via frontend or:");
    console.log("      npx hardhat run scripts/test-flashloan.js --network localhost");
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("           TOKEN ADDRESSES (Add to MetaMask)");
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log("DAI:  ", daiAddress);
  console.log("WETH: ", wethAddress);
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
