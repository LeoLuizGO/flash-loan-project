/**
 * Withdraw Script
 * Withdraws accumulated profits from the FlashLoanAMM contract
 * Run: npx hardhat run scripts/withdraw.js --network localhost
 */

import hre from "hardhat";
import fs from "fs";

const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

async function main() {
  console.log("========================================");
  console.log("  Withdraw Profits from FlashLoanAMM");
  console.log("========================================\n");

  // Load deployment info
  const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf-8"));
  const [deployer] = await hre.ethers.getSigners();

  console.log("FlashLoan address:", deployment.contracts.flashLoan);
  console.log("Withdrawing to:", deployer.address);

  // Get contract
  const FlashLoanAMM = await hre.ethers.getContractFactory("FlashLoanAMM");
  const flashLoan = FlashLoanAMM.attach(deployment.contracts.flashLoan);

  // Get token contracts
  const DAI = await hre.ethers.getContractAt("IERC20", DAI_ADDRESS);
  const WETH = await hre.ethers.getContractAt("IERC20", WETH_ADDRESS);

  // Check balances in contract
  const daiInContract = await DAI.balanceOf(deployment.contracts.flashLoan);
  const wethInContract = await WETH.balanceOf(deployment.contracts.flashLoan);

  console.log("\nBalances in FlashLoanAMM contract:");
  console.log("  DAI:", hre.ethers.formatEther(daiInContract));
  console.log("  WETH:", hre.ethers.formatEther(wethInContract));

  // Check deployer balances before
  const daiBeforeDeployer = await DAI.balanceOf(deployer.address);
  const wethBeforeDeployer = await WETH.balanceOf(deployer.address);

  console.log("\nYour balances before withdraw:");
  console.log("  DAI:", hre.ethers.formatEther(daiBeforeDeployer));
  console.log("  WETH:", hre.ethers.formatEther(wethBeforeDeployer));

  // Withdraw DAI if there's any
  if (daiInContract > 0n) {
    console.log("\nWithdrawing DAI...");
    const tx1 = await flashLoan.withdraw(DAI_ADDRESS);
    await tx1.wait();
    console.log("  Done!");
  }

  // Withdraw WETH if there's any
  if (wethInContract > 0n) {
    console.log("Withdrawing WETH...");
    const tx2 = await flashLoan.withdraw(WETH_ADDRESS);
    await tx2.wait();
    console.log("  Done!");
  }

  // Check deployer balances after
  const daiAfterDeployer = await DAI.balanceOf(deployer.address);
  const wethAfterDeployer = await WETH.balanceOf(deployer.address);

  console.log("\nYour balances after withdraw:");
  console.log("  DAI:", hre.ethers.formatEther(daiAfterDeployer));
  console.log("  WETH:", hre.ethers.formatEther(wethAfterDeployer));

  console.log("\nProfit received:");
  console.log("  DAI:", hre.ethers.formatEther(daiAfterDeployer - daiBeforeDeployer));
  console.log("  WETH:", hre.ethers.formatEther(wethAfterDeployer - wethBeforeDeployer));

  console.log("\n========================================");
  console.log("  WITHDRAWAL COMPLETE!");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
