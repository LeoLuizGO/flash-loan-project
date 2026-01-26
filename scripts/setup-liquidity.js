/**
 * Setup Liquidity Script
 *
 * This script:
 * 1. Impersonates whale accounts (DAI + WETH holders)
 * 2. Adds liquidity to both DexAMM contracts
 *
 * Run: npx hardhat run scripts/setup-liquidity.js --network hardhat
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";

// Token addresses
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// Whale addresses (large token holders on mainnet)
const DAI_WHALE = "0x28C6c06298d514Db089934071355E5743bf21d60"; // Binance
const WETH_WHALE = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28"; // Lido

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

async function main() {
  console.log("========================================");
  console.log("  Setup Liquidity Script");
  console.log("========================================\n");

  // Load deployment info
  const deploymentPath = path.join(process.cwd(), "deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("ERROR: deployment.json not found!");
    console.error("Please run deploy.js first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const { dexA, dexB } = deployment.contracts;

  console.log("Loaded deployment:");
  console.log("  DexA:", dexA);
  console.log("  DexB:", dexB);

  // Get signers
  const [deployer] = await hre.ethers.getSigners();

  // Impersonate whales
  console.log("\n1. Impersonating whale accounts...");

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [DAI_WHALE],
  });

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [WETH_WHALE],
  });

  // Fund whales with ETH for gas
  await deployer.sendTransaction({
    to: DAI_WHALE,
    value: hre.ethers.parseEther("10"),
  });

  await deployer.sendTransaction({
    to: WETH_WHALE,
    value: hre.ethers.parseEther("10"),
  });

  const daiWhale = await hre.ethers.getSigner(DAI_WHALE);
  const wethWhale = await hre.ethers.getSigner(WETH_WHALE);

  console.log("   DAI Whale:", DAI_WHALE);
  console.log("   WETH Whale:", WETH_WHALE);

  // Get token contracts
  const dai = new hre.ethers.Contract(DAI_ADDRESS, ERC20_ABI, daiWhale);
  const weth = new hre.ethers.Contract(WETH_ADDRESS, ERC20_ABI, wethWhale);

  // Check whale balances
  const daiBalance = await dai.balanceOf(DAI_WHALE);
  const wethBalance = await weth.balanceOf(WETH_WHALE);

  console.log("\n2. Whale balances:");
  console.log("   DAI Whale balance:", hre.ethers.formatEther(daiBalance), "DAI");
  console.log("   WETH Whale balance:", hre.ethers.formatEther(wethBalance), "WETH");

  // Liquidity amounts
  // DexA: 1,000,000 DAI + 500 WETH (price: 0.0005 WETH/DAI = 2000 DAI/WETH)
  // DexB: 1,000,000 DAI + 500 WETH (same initial price)
  const daiLiquidity = hre.ethers.parseEther("1000000"); // 1M DAI
  const wethLiquidity = hre.ethers.parseEther("500"); // 500 WETH

  // Get DexAMM contracts
  const DexAMM = await hre.ethers.getContractFactory("DexAMM");
  const dexAContract = DexAMM.attach(dexA);
  const dexBContract = DexAMM.attach(dexB);

  // Transfer tokens to deployer first
  console.log("\n3. Transferring tokens to deployer...");

  // Transfer DAI (need 2M for both DEXs)
  const totalDai = daiLiquidity * 2n;
  await dai.transfer(deployer.address, totalDai);
  console.log("   Transferred", hre.ethers.formatEther(totalDai), "DAI");

  // Transfer WETH (need 1000 for both DEXs)
  const totalWeth = wethLiquidity * 2n;
  const wethAsWhale = weth.connect(wethWhale);
  await wethAsWhale.transfer(deployer.address, totalWeth);
  console.log("   Transferred", hre.ethers.formatEther(totalWeth), "WETH");

  // Connect tokens to deployer
  const daiAsDeployer = new hre.ethers.Contract(DAI_ADDRESS, ERC20_ABI, deployer);
  const wethAsDeployer = new hre.ethers.Contract(WETH_ADDRESS, ERC20_ABI, deployer);

  // Add liquidity to DexA
  console.log("\n4. Adding liquidity to DexA...");

  await daiAsDeployer.approve(dexA, daiLiquidity);
  await wethAsDeployer.approve(dexA, wethLiquidity);

  const dexAAsDeployer = dexAContract.connect(deployer);
  await dexAAsDeployer.addLiquidity(daiLiquidity, wethLiquidity);

  const dexADaiBalance = await dexAAsDeployer.getDAIBalance();
  const dexAWethBalance = await dexAAsDeployer.getWETHBalance();
  const dexAPrice = await dexAAsDeployer.getPrice();

  console.log("   DexA DAI Balance:", hre.ethers.formatEther(dexADaiBalance));
  console.log("   DexA WETH Balance:", hre.ethers.formatEther(dexAWethBalance));
  console.log("   DexA Price (WETH/DAI):", hre.ethers.formatEther(dexAPrice));

  // Add liquidity to DexB
  console.log("\n5. Adding liquidity to DexB...");

  await daiAsDeployer.approve(dexB, daiLiquidity);
  await wethAsDeployer.approve(dexB, wethLiquidity);

  const dexBAsDeployer = dexBContract.connect(deployer);
  await dexBAsDeployer.addLiquidity(daiLiquidity, wethLiquidity);

  const dexBDaiBalance = await dexBAsDeployer.getDAIBalance();
  const dexBWethBalance = await dexBAsDeployer.getWETHBalance();
  const dexBPrice = await dexBAsDeployer.getPrice();

  console.log("   DexB DAI Balance:", hre.ethers.formatEther(dexBDaiBalance));
  console.log("   DexB WETH Balance:", hre.ethers.formatEther(dexBWethBalance));
  console.log("   DexB Price (WETH/DAI):", hre.ethers.formatEther(dexBPrice));

  // Stop impersonating
  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [DAI_WHALE],
  });

  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [WETH_WHALE],
  });

  console.log("\n========================================");
  console.log("  Liquidity Setup Complete!");
  console.log("========================================");
  console.log("\nBoth DEXs now have:");
  console.log("  - 1,000,000 DAI");
  console.log("  - 500 WETH");
  console.log("  - Price: ~0.0005 WETH/DAI (2000 DAI/WETH)");
  console.log("\nNext step:");
  console.log("  Run: npx hardhat run scripts/create-arbitrage.js --network hardhat");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
