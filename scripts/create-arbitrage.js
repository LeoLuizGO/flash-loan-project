/**
 * Create Arbitrage Opportunity Script
 *
 * This script creates a price difference between the two DEXs
 * by making a large swap on one of them, creating an arbitrage opportunity.
 *
 * Run: npx hardhat run scripts/create-arbitrage.js --network hardhat
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";

// Token addresses
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// Whale addresses
const DAI_WHALE = "0x28C6c06298d514Db089934071355E5743bf21d60";

// ERC20 ABI
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

async function main() {
  console.log("========================================");
  console.log("  Create Arbitrage Opportunity Script");
  console.log("========================================\n");

  // Load deployment info
  const deploymentPath = path.join(process.cwd(), "deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("ERROR: deployment.json not found!");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const { dexA, dexB, flashLoan } = deployment.contracts;

  const [deployer] = await hre.ethers.getSigners();

  // Get contracts
  const DexAMM = await hre.ethers.getContractFactory("DexAMM");
  const dexAContract = DexAMM.attach(dexA).connect(deployer);
  const dexBContract = DexAMM.attach(dexB).connect(deployer);

  // Show initial prices
  console.log("1. Initial State:");
  const priceA1 = await dexAContract.getPrice();
  const priceB1 = await dexBContract.getPrice();
  console.log("   DexA Price:", hre.ethers.formatEther(priceA1), "WETH/DAI");
  console.log("   DexB Price:", hre.ethers.formatEther(priceB1), "WETH/DAI");

  const priceDiff1 = Math.abs(
    (Number(priceA1) - Number(priceB1)) / ((Number(priceA1) + Number(priceB1)) / 2)
  ) * 100;
  console.log("   Price Difference:", priceDiff1.toFixed(4), "%");

  // Impersonate whale to make a swap
  console.log("\n2. Creating price difference...");

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [DAI_WHALE],
  });

  await deployer.sendTransaction({
    to: DAI_WHALE,
    value: hre.ethers.parseEther("10"),
  });

  const daiWhale = await hre.ethers.getSigner(DAI_WHALE);
  const dai = new hre.ethers.Contract(DAI_ADDRESS, ERC20_ABI, daiWhale);

  // Make a large swap on DexA to move the price
  // Swapping 100,000 DAI for WETH on DexA
  // This will:
  // - Increase DAI reserves on DexA
  // - Decrease WETH reserves on DexA
  // - Result in higher WETH/DAI price on DexA (WETH becomes more expensive)
  const swapAmount = hre.ethers.parseEther("100000"); // 100k DAI

  console.log("   Swapping 100,000 DAI -> WETH on DexA...");

  await dai.approve(dexA, swapAmount);

  const dexAAsWhale = dexAContract.connect(daiWhale);
  await dexAAsWhale.buyWETH(swapAmount, 0); // minWethOut = 0 for this setup

  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [DAI_WHALE],
  });

  // Show new prices
  console.log("\n3. New State After Swap:");
  const priceA2 = await dexAContract.getPrice();
  const priceB2 = await dexBContract.getPrice();

  console.log("   DexA Price:", hre.ethers.formatEther(priceA2), "WETH/DAI");
  console.log("   DexB Price:", hre.ethers.formatEther(priceB2), "WETH/DAI");

  const priceDiff2 = Math.abs(
    (Number(priceA2) - Number(priceB2)) / ((Number(priceA2) + Number(priceB2)) / 2)
  ) * 100;
  console.log("   Price Difference:", priceDiff2.toFixed(4), "%");

  // Show reserves
  console.log("\n4. Current Reserves:");
  console.log("   DexA:");
  console.log("     DAI:", hre.ethers.formatEther(await dexAContract.getDAIBalance()));
  console.log("     WETH:", hre.ethers.formatEther(await dexAContract.getWETHBalance()));
  console.log("   DexB:");
  console.log("     DAI:", hre.ethers.formatEther(await dexBContract.getDAIBalance()));
  console.log("     WETH:", hre.ethers.formatEther(await dexBContract.getWETHBalance()));

  // Check if profitable
  const isProfitable = priceDiff2 > 0.6;

  console.log("\n========================================");
  if (isProfitable) {
    console.log("  ARBITRAGE OPPORTUNITY CREATED!");
    console.log("========================================");
    console.log("\nPrice difference:", priceDiff2.toFixed(4), "%");
    console.log("Minimum required: 0.6% (to cover 2x 0.3% AMM fees)");
    console.log("\nStrategy:");
    if (Number(priceA2) > Number(priceB2)) {
      console.log("  1. Flash loan DAI from Aave");
      console.log("  2. Buy WETH on DexA (cheaper WETH)");
      console.log("  3. Sell WETH on DexB (expensive WETH)");
      console.log("  4. Repay flash loan + profit");
    } else {
      console.log("  1. Flash loan DAI from Aave");
      console.log("  2. Buy WETH on DexB (cheaper WETH)");
      console.log("  3. Sell WETH on DexA (expensive WETH)");
      console.log("  4. Repay flash loan + profit");
    }
  } else {
    console.log("  No Arbitrage Opportunity");
    console.log("========================================");
    console.log("\nPrice difference:", priceDiff2.toFixed(4), "% (need > 0.6%)");
    console.log("Run the script again or increase swap amount.");
  }

  console.log("\nFlashLoan Contract:", flashLoan);
  console.log("\nNext step:");
  console.log("  1. Start Hardhat node: npx hardhat node");
  console.log("  2. In another terminal, run all scripts against localhost");
  console.log("  3. Start frontend: cd frontend && npm start");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
