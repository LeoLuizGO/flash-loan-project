/**
 * Deploy Script - FlashLoanAMM + DexAMM
 *
 * This script deploys:
 * 1. DexAMM #1 (dexA)
 * 2. DexAMM #2 (dexB)
 * 3. FlashLoanAMM (connected to both DEXs)
 *
 * Run: npx hardhat run scripts/deploy.js --network hardhat
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";

// Mainnet addresses
const AAVE_POOL_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";

async function main() {
  console.log("========================================");
  console.log("  Flash Loan AMM - Deployment Script");
  console.log("========================================\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // 1. Deploy DexAMM #1
  console.log("1. Deploying DexAMM #1...");
  const DexAMM = await hre.ethers.getContractFactory("DexAMM");
  const dexA = await DexAMM.deploy();
  await dexA.waitForDeployment();
  const dexAAddress = await dexA.getAddress();
  console.log("   DexAMM #1 deployed to:", dexAAddress);

  // 2. Deploy DexAMM #2
  console.log("\n2. Deploying DexAMM #2...");
  const dexB = await DexAMM.deploy();
  await dexB.waitForDeployment();
  const dexBAddress = await dexB.getAddress();
  console.log("   DexAMM #2 deployed to:", dexBAddress);

  // 3. Deploy FlashLoanAMM
  console.log("\n3. Deploying FlashLoanAMM...");
  const FlashLoanAMM = await hre.ethers.getContractFactory("FlashLoanAMM");
  const flashLoan = await FlashLoanAMM.deploy(
    AAVE_POOL_PROVIDER,
    dexAAddress,
    dexBAddress
  );
  await flashLoan.waitForDeployment();
  const flashLoanAddress = await flashLoan.getAddress();
  console.log("   FlashLoanAMM deployed to:", flashLoanAddress);

  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      dexA: dexAAddress,
      dexB: dexBAddress,
      flashLoan: flashLoanAddress,
      aavePoolProvider: AAVE_POOL_PROVIDER,
    },
    tokens: {
      DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    },
  };

  // Save to file
  const deploymentPath = path.join(process.cwd(), "deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n4. Deployment info saved to:", deploymentPath);

  // Update frontend constants
  const frontendConstantsPath = path.join(
    process.cwd(),
    "frontend/src/utils/constants.ts"
  );

  if (fs.existsSync(frontendConstantsPath)) {
    let constantsContent = fs.readFileSync(frontendConstantsPath, "utf-8");

    constantsContent = constantsContent.replace(
      /export const FLASH_LOAN_ADDRESS = '[^']*'/,
      `export const FLASH_LOAN_ADDRESS = '${flashLoanAddress}'`
    );
    constantsContent = constantsContent.replace(
      /export const DEX_A_ADDRESS = '[^']*'/,
      `export const DEX_A_ADDRESS = '${dexAAddress}'`
    );
    constantsContent = constantsContent.replace(
      /export const DEX_B_ADDRESS = '[^']*'/,
      `export const DEX_B_ADDRESS = '${dexBAddress}'`
    );

    fs.writeFileSync(frontendConstantsPath, constantsContent);
    console.log("5. Frontend constants updated!");
  }

  console.log("\n========================================");
  console.log("  Deployment Complete!");
  console.log("========================================");
  console.log("\nContract Addresses:");
  console.log("  DexAMM #1:      ", dexAAddress);
  console.log("  DexAMM #2:      ", dexBAddress);
  console.log("  FlashLoanAMM:   ", flashLoanAddress);
  console.log("\nNext steps:");
  console.log("  1. Run: npx hardhat run scripts/setup-liquidity.js --network hardhat");
  console.log("  2. Run: npx hardhat run scripts/create-arbitrage.js --network hardhat");
  console.log("  3. Start frontend: cd frontend && npm start");

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
