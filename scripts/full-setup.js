/**
 * Full Setup Script - All in One
 *
 * This script does everything in one go:
 * 1. Deploy all contracts
 * 2. Setup liquidity
 * 3. Create arbitrage opportunity
 * 4. Add deployer as authorized signer
 *
 * Run: npx hardhat run scripts/full-setup.js --network localhost
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";

// Constants
const AAVE_POOL_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// Multiple whale candidates - will check balances and use the one with funds
const DAI_WHALE_CANDIDATES = [
  "0x40ec5B33f54e0E8A33A975908C5BA1c14e5BbbDf", // Polygon Bridge
  "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643", // Compound cDAI
  "0x89B78CfA322F6C5dE0aBcEecab66Aee45393cC5A", // Maker PSM
  "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11", // Uniswap DAI/WETH
  "0xBEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", // Curve 3pool
];

const WETH_WHALE_CANDIDATES = [
  "0x2F0b23f53734252Bda2277357e97e1517d6B042A", // Lido
  "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e", // Aave aWETH
  "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11", // Uniswap DAI/WETH
  "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640", // Uniswap v3 USDC/ETH
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║          FLASH LOAN AMM - FULL SETUP SCRIPT                ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Network:", hre.network.name);

  // Set base fee to a reasonable value for local testing
  await hre.network.provider.send("hardhat_setNextBlockBaseFeePerGas", [
    "0x1" // 1 wei - minimal base fee
  ]);
  console.log("Base fee adjusted for local testing");
  console.log("");

  // ============================================
  // STEP 1: DEPLOY CONTRACTS
  // ============================================
  console.log("┌────────────────────────────────────────┐");
  console.log("│  STEP 1: Deploying Contracts           │");
  console.log("└────────────────────────────────────────┘\n");

  // Deploy DexAMM #1
  console.log("Deploying DexAMM #1...");
  const DexAMM = await hre.ethers.getContractFactory("DexAMM");
  const dexA = await DexAMM.deploy();
  await dexA.waitForDeployment();
  const dexAAddress = await dexA.getAddress();
  console.log("✓ DexAMM #1:", dexAAddress);

  // Deploy DexAMM #2
  console.log("Deploying DexAMM #2...");
  const dexB = await DexAMM.deploy();
  await dexB.waitForDeployment();
  const dexBAddress = await dexB.getAddress();
  console.log("✓ DexAMM #2:", dexBAddress);

  // Deploy FlashLoanAMM
  console.log("Deploying FlashLoanAMM...");
  const FlashLoanAMM = await hre.ethers.getContractFactory("FlashLoanAMM");
  const flashLoan = await FlashLoanAMM.deploy(AAVE_POOL_PROVIDER, dexAAddress, dexBAddress);
  await flashLoan.waitForDeployment();
  const flashLoanAddress = await flashLoan.getAddress();
  console.log("✓ FlashLoanAMM:", flashLoanAddress);

  // Save deployment
  const deployment = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      dexA: dexAAddress,
      dexB: dexBAddress,
      flashLoan: flashLoanAddress,
    },
  };
  fs.writeFileSync("deployment.json", JSON.stringify(deployment, null, 2));
  console.log("✓ Saved to deployment.json\n");

  // ============================================
  // STEP 2: SETUP LIQUIDITY
  // ============================================
  console.log("┌────────────────────────────────────────┐");
  console.log("│  STEP 2: Adding Liquidity              │");
  console.log("└────────────────────────────────────────┘\n");

  // Liquidity amounts
  const daiLiquidity = hre.ethers.parseEther("1000000"); // 1M DAI per DEX
  const wethLiquidity = hre.ethers.parseEther("500"); // 500 WETH per DEX
  const totalDaiNeeded = daiLiquidity * 3n; // Extra for arbitrage swap
  const totalWethNeeded = wethLiquidity * 2n;

  // Find a DAI whale with enough balance
  console.log("Finding DAI whale...");
  let daiWhaleAddress = null;
  const daiContract = new hre.ethers.Contract(DAI_ADDRESS, ERC20_ABI, deployer);

  for (const candidate of DAI_WHALE_CANDIDATES) {
    const balance = await daiContract.balanceOf(candidate);
    console.log(`  ${candidate}: ${hre.ethers.formatEther(balance)} DAI`);
    if (balance >= totalDaiNeeded) {
      daiWhaleAddress = candidate;
      console.log(`  ✓ Using this whale`);
      break;
    }
  }

  if (!daiWhaleAddress) {
    throw new Error("No DAI whale found with sufficient balance!");
  }

  // Find a WETH whale with enough balance
  console.log("\nFinding WETH whale...");
  let wethWhaleAddress = null;
  const wethContract = new hre.ethers.Contract(WETH_ADDRESS, ERC20_ABI, deployer);

  for (const candidate of WETH_WHALE_CANDIDATES) {
    const balance = await wethContract.balanceOf(candidate);
    console.log(`  ${candidate}: ${hre.ethers.formatEther(balance)} WETH`);
    if (balance >= totalWethNeeded) {
      wethWhaleAddress = candidate;
      console.log(`  ✓ Using this whale`);
      break;
    }
  }

  if (!wethWhaleAddress) {
    throw new Error("No WETH whale found with sufficient balance!");
  }

  // Impersonate whales
  console.log("\nImpersonating whales...");
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [daiWhaleAddress],
  });
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [wethWhaleAddress],
  });

  // Fund whales with ETH for gas using hardhat_setBalance (works even for contracts)
  await hre.network.provider.send("hardhat_setBalance", [
    daiWhaleAddress,
    "0x56BC75E2D63100000", // 100 ETH in hex
  ]);
  await hre.network.provider.send("hardhat_setBalance", [
    wethWhaleAddress,
    "0x56BC75E2D63100000", // 100 ETH in hex
  ]);
  console.log("✓ Funded whales with ETH for gas");

  const daiWhale = await hre.ethers.getSigner(daiWhaleAddress);
  const wethWhale = await hre.ethers.getSigner(wethWhaleAddress);

  const dai = new hre.ethers.Contract(DAI_ADDRESS, ERC20_ABI, daiWhale);
  const weth = new hre.ethers.Contract(WETH_ADDRESS, ERC20_ABI, wethWhale);

  // Transfer to deployer
  console.log("\nTransferring tokens from whales...");
  await dai.transfer(deployer.address, totalDaiNeeded);
  await weth.connect(wethWhale).transfer(deployer.address, totalWethNeeded);
  console.log("✓ Transferred DAI and WETH to deployer\n");

  // Add liquidity to DexA
  console.log("Adding liquidity to DexA...");
  const daiDeployer = new hre.ethers.Contract(DAI_ADDRESS, ERC20_ABI, deployer);
  const wethDeployer = new hre.ethers.Contract(WETH_ADDRESS, ERC20_ABI, deployer);

  await daiDeployer.approve(dexAAddress, daiLiquidity);
  await wethDeployer.approve(dexAAddress, wethLiquidity);
  await dexA.connect(deployer).addLiquidity(daiLiquidity, wethLiquidity);
  console.log("✓ DexA: 1M DAI + 500 WETH");

  // Add liquidity to DexB
  console.log("Adding liquidity to DexB...");
  await daiDeployer.approve(dexBAddress, daiLiquidity);
  await wethDeployer.approve(dexBAddress, wethLiquidity);
  await dexB.connect(deployer).addLiquidity(daiLiquidity, wethLiquidity);
  console.log("✓ DexB: 1M DAI + 500 WETH\n");

  // ============================================
  // STEP 3: CREATE ARBITRAGE OPPORTUNITY
  // ============================================
  console.log("┌────────────────────────────────────────┐");
  console.log("│  STEP 3: Creating Arbitrage            │");
  console.log("└────────────────────────────────────────┘\n");

  // Check initial prices
  let priceA = await dexA.getPrice();
  let priceB = await dexB.getPrice();
  console.log("Initial Prices:");
  console.log("  DexA:", hre.ethers.formatEther(priceA), "WETH/DAI");
  console.log("  DexB:", hre.ethers.formatEther(priceB), "WETH/DAI");

  // Make swap on DexA to create price difference (using deployer who now has DAI)
  console.log("\nSwapping 100,000 DAI -> WETH on DexA...");
  const swapAmount = hre.ethers.parseEther("100000");
  await daiDeployer.approve(dexAAddress, swapAmount);
  await dexA.connect(deployer).buyWETH(swapAmount, 0);

  // Check new prices
  priceA = await dexA.getPrice();
  priceB = await dexB.getPrice();

  const priceDiff = Math.abs(
    (Number(priceA) - Number(priceB)) / ((Number(priceA) + Number(priceB)) / 2)
  ) * 100;

  console.log("\nNew Prices:");
  console.log("  DexA:", hre.ethers.formatEther(priceA), "WETH/DAI");
  console.log("  DexB:", hre.ethers.formatEther(priceB), "WETH/DAI");
  console.log("  Difference:", priceDiff.toFixed(4), "%");
  console.log("✓ Arbitrage opportunity created!\n");

  // Stop impersonating
  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [daiWhaleAddress],
  });
  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [wethWhaleAddress],
  });

  // ============================================
  // STEP 4: ADD SIGNER
  // ============================================
  console.log("┌────────────────────────────────────────┐");
  console.log("│  STEP 4: Adding Authorized Signer      │");
  console.log("└────────────────────────────────────────┘\n");

  const isAuthorized = await flashLoan.authorizedSigners(deployer.address);
  if (!isAuthorized) {
    await flashLoan.connect(deployer).addSigner(deployer.address);
    console.log("✓ Added deployer as authorized signer");
  } else {
    console.log("✓ Deployer already authorized");
  }

  // ============================================
  // STEP 5: UPDATE FRONTEND
  // ============================================
  console.log("\n┌────────────────────────────────────────┐");
  console.log("│  STEP 5: Updating Frontend Config      │");
  console.log("└────────────────────────────────────────┘\n");

  const frontendConstantsPath = path.join(process.cwd(), "frontend/src/utils/constants.ts");
  if (fs.existsSync(frontendConstantsPath)) {
    let content = fs.readFileSync(frontendConstantsPath, "utf-8");
    content = content.replace(
      /export const FLASH_LOAN_ADDRESS = '[^']*'/,
      `export const FLASH_LOAN_ADDRESS = '${flashLoanAddress}'`
    );
    content = content.replace(
      /export const DEX_A_ADDRESS = '[^']*'/,
      `export const DEX_A_ADDRESS = '${dexAAddress}'`
    );
    content = content.replace(
      /export const DEX_B_ADDRESS = '[^']*'/,
      `export const DEX_B_ADDRESS = '${dexBAddress}'`
    );
    fs.writeFileSync(frontendConstantsPath, content);
    console.log("✓ Frontend constants updated");
  } else {
    console.log("! Frontend constants file not found (will need manual update)");
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                    SETUP COMPLETE!                         ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("Contract Addresses:");
  console.log("  ├─ DexAMM #1:    ", dexAAddress);
  console.log("  ├─ DexAMM #2:    ", dexBAddress);
  console.log("  └─ FlashLoanAMM: ", flashLoanAddress);
  console.log("");
  console.log("Price Information:");
  console.log("  ├─ DexA Price:   ", hre.ethers.formatEther(priceA), "WETH/DAI");
  console.log("  ├─ DexB Price:   ", hre.ethers.formatEther(priceB), "WETH/DAI");
  console.log("  └─ Difference:   ", priceDiff.toFixed(4), "%");
  console.log("");
  console.log("Authorized Signer:", deployer.address);
  console.log("");
  console.log("┌────────────────────────────────────────┐");
  console.log("│  NEXT STEPS:                           │");
  console.log("├────────────────────────────────────────┤");
  console.log("│  1. cd frontend                        │");
  console.log("│  2. npm install                        │");
  console.log("│  3. npm start                          │");
  console.log("│  4. Connect MetaMask to localhost:8545 │");
  console.log("│  5. Import deployer account to MM      │");
  console.log("└────────────────────────────────────────┘");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
