/**
 * Add Signer Script
 *
 * This script adds an authorized signer to the FlashLoanAMM contract.
 * Only authorized signers can execute flash loans.
 *
 * Run: npx hardhat run scripts/add-signer.js --network hardhat
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("========================================");
  console.log("  Add Authorized Signer Script");
  console.log("========================================\n");

  // Load deployment info
  const deploymentPath = path.join(process.cwd(), "deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("ERROR: deployment.json not found!");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const { flashLoan } = deployment.contracts;

  const [deployer] = await hre.ethers.getSigners();

  console.log("FlashLoan Contract:", flashLoan);
  console.log("Deployer (will be added as signer):", deployer.address);

  // Get FlashLoanAMM contract
  const FlashLoanAMM = await hre.ethers.getContractFactory("FlashLoanAMM");
  const flashLoanContract = FlashLoanAMM.attach(flashLoan).connect(deployer);

  // Check if already authorized
  const isAlreadyAuthorized = await flashLoanContract.authorizedSigners(deployer.address);

  if (isAlreadyAuthorized) {
    console.log("\nDeployer is already an authorized signer!");
  } else {
    console.log("\nAdding deployer as authorized signer...");
    const tx = await flashLoanContract.addSigner(deployer.address);
    await tx.wait();
    console.log("Transaction hash:", tx.hash);

    // Verify
    const isNowAuthorized = await flashLoanContract.authorizedSigners(deployer.address);
    console.log("Deployer authorized:", isNowAuthorized);
  }

  // You can also add other addresses here
  // For example, to add a specific address:
  //
  // const ADDRESS_TO_ADD = "0x...";
  // const isAuthorized = await flashLoanContract.authorizedSigners(ADDRESS_TO_ADD);
  // if (!isAuthorized) {
  //   await flashLoanContract.addSigner(ADDRESS_TO_ADD);
  //   console.log("Added:", ADDRESS_TO_ADD);
  // }

  console.log("\n========================================");
  console.log("  Signer Setup Complete!");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
