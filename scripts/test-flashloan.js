/**
 * Test Flash Loan Script
 *
 * Tests the flash loan execution directly from command line
 * Run: npx hardhat run scripts/test-flashloan.js --network localhost
 */

import hre from "hardhat";
import fs from "fs";

const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

async function main() {
  console.log("Testing Flash Loan...\n");

  // Load deployment info
  const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf-8"));
  console.log("FlashLoan address:", deployment.contracts.flashLoan);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Signer:", deployer.address);

  // Get contract
  const FlashLoanAMM = await hre.ethers.getContractFactory("FlashLoanAMM");
  const flashLoan = FlashLoanAMM.attach(deployment.contracts.flashLoan);

  // Check if signer is authorized
  const isAuthorized = await flashLoan.authorizedSigners(deployer.address);
  console.log("Is authorized:", isAuthorized);

  if (!isAuthorized) {
    console.log("ERROR: Signer not authorized!");
    return;
  }

  // Parameters
  const token = DAI_ADDRESS;
  const amount = hre.ethers.parseEther("10000"); // 10,000 DAI
  const maxSlippageBps = 100; // 1%
  const nonce = 999; // Use unique nonce for testing

  console.log("\nParameters:");
  console.log("  Token:", token);
  console.log("  Amount:", hre.ethers.formatEther(amount), "DAI");
  console.log("  Slippage:", maxSlippageBps, "bps (1%)");
  console.log("  Nonce:", nonce);

  // Create message hash
  const messageHash = hre.ethers.solidityPackedKeccak256(
    ["address", "uint256", "uint256", "address"],
    [token, amount, nonce, deployment.contracts.flashLoan]
  );
  console.log("\nMessage hash:", messageHash);

  // Sign the message
  const signature = await deployer.signMessage(hre.ethers.getBytes(messageHash));
  console.log("Signature:", signature);

  // Verify the signature locally
  const ethSignedHash = hre.ethers.solidityPackedKeccak256(
    ["string", "bytes32"],
    ["\x19Ethereum Signed Message:\n32", messageHash]
  );
  const recoveredAddress = hre.ethers.recoverAddress(ethSignedHash, signature);
  console.log("Recovered address:", recoveredAddress);
  console.log("Matches deployer:", recoveredAddress.toLowerCase() === deployer.address.toLowerCase());

  // Get DEX info before
  const DexAMM = await hre.ethers.getContractFactory("DexAMM");
  const dexA = DexAMM.attach(deployment.contracts.dexA);
  const dexB = DexAMM.attach(deployment.contracts.dexB);

  const priceA = await dexA.getPrice();
  const priceB = await dexB.getPrice();
  console.log("\nDEX Prices:");
  console.log("  DexA:", hre.ethers.formatEther(priceA), "WETH/DAI");
  console.log("  DexB:", hre.ethers.formatEther(priceB), "WETH/DAI");

  const priceDiff = Math.abs(Number(priceA) - Number(priceB)) / ((Number(priceA) + Number(priceB)) / 2) * 100;
  console.log("  Difference:", priceDiff.toFixed(4), "%");

  // Get DAI balance before
  const DAI = await hre.ethers.getContractAt("IERC20", DAI_ADDRESS);
  const balanceBefore = await DAI.balanceOf(deployment.contracts.flashLoan);
  console.log("\nFlashLoan DAI balance before:", hre.ethers.formatEther(balanceBefore));

  // Execute flash loan
  console.log("\nExecuting flash loan...");
  try {
    const tx = await flashLoan.requestFlashLoan(
      token,
      amount,
      maxSlippageBps,
      nonce,
      signature
    );
    console.log("Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transaction confirmed!");
    console.log("Gas used:", receipt.gasUsed.toString());

    // Parse events
    for (const log of receipt.logs) {
      try {
        const parsed = flashLoan.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });
        if (parsed?.name === "FlashLoanExecuted") {
          console.log("\nFlashLoanExecuted event:");
          console.log("  Token:", parsed.args.token);
          console.log("  Amount:", hre.ethers.formatEther(parsed.args.amount));
          console.log("  Profit:", hre.ethers.formatEther(parsed.args.profit));
          console.log("  Initiator:", parsed.args.initiator);
        }
      } catch {
        // Skip non-matching logs
      }
    }

    // Get DAI balance after
    const balanceAfter = await DAI.balanceOf(deployment.contracts.flashLoan);
    console.log("\nFlashLoan DAI balance after:", hre.ethers.formatEther(balanceAfter));
    console.log("Profit:", hre.ethers.formatEther(balanceAfter - balanceBefore), "DAI");

  } catch (error) {
    console.error("\nTransaction failed!");
    console.error("Error:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
