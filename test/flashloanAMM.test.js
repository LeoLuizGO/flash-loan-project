import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("Flashloan Arbitrage (DEX AMM)", function () {
  const POOL_ADDRESS_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";

  const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  const DAI_WHALE = "0x28C6c06298d514Db089934071355E5743bf21d60";
  const WETH_WHALE = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  let dai, weth;
  let owner, daiWhale, wethWhale;
  let dexA, dexB;
  let arb;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [{
        forking: {
          jsonRpcUrl: process.env.MAINNET_RPC_URL,
          blockNumber: 18000000
        }
      }]
    });

    dai = await ethers.getContractAt(
      "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol:IERC20",
      DAI_ADDRESS
    );
    weth = await ethers.getContractAt(
      "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol:IERC20",
      WETH_ADDRESS
    );

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [DAI_WHALE],
    });
    daiWhale = await ethers.getSigner(DAI_WHALE);

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WETH_WHALE],
    });
    wethWhale = await ethers.getSigner(WETH_WHALE);

    await owner.sendTransaction({ to: DAI_WHALE, value: ethers.parseEther("10") });
    await owner.sendTransaction({ to: WETH_WHALE, value: ethers.parseEther("10") });

    const DexAMM = await ethers.getContractFactory("DexAMM");
    dexA = await DexAMM.deploy();
    await dexA.waitForDeployment();
    dexB = await DexAMM.deploy();
    await dexB.waitForDeployment();

    // Transfer enough tokens for all liquidity
    await dai.connect(daiWhale).transfer(owner.address, ethers.parseUnits("800000", 18));
    await weth.connect(wethWhale).transfer(owner.address, ethers.parseUnits("150", 18));

    // Add liquidity to both dexes
    await dai.connect(owner).approve(dexA.target, ethers.parseUnits("100000", 18));
    await weth.connect(owner).approve(dexA.target, ethers.parseUnits("50", 18));
    await dexA.connect(owner).addLiquidity(ethers.parseUnits("100000", 18), ethers.parseUnits("50", 18));

    await dai.connect(owner).approve(dexB.target, ethers.parseUnits("150000", 18));
    await weth.connect(owner).approve(dexB.target, ethers.parseUnits("50", 18));
    await dexB.connect(owner).addLiquidity(ethers.parseUnits("150000", 18), ethers.parseUnits("50", 18));

    const FlashLoan = await ethers.getContractFactory("FlashLoanAMM");
    arb = await FlashLoan.deploy(POOL_ADDRESS_PROVIDER, dexA.target, dexB.target);
    await arb.waitForDeployment();
  });

  /**
   * Helper function to create a signature
   */
  async function createSignature(signer, token, amount, nonce, contractAddress) {
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address"],
      [token, amount, nonce, contractAddress]
    );

    const signature = await signer.signMessage(ethers.getBytes(messageHash));
    return signature;
  }

  it("Should perform DAI → WETH → DAI arbitrage via flashloan and make profit", async function () {
    const flashloanAmount = ethers.parseUnits("1000", 18);

    // Slippage: 1% = 100 bps
    const maxSlippageBps = 100;

    const daiBefore = await dai.balanceOf(arb.target);
    const dexAPriceBefore = await dexA.getPrice();
    const dexBPriceBefore = await dexB.getPrice();

    console.log("Before:");
    console.log("  Arb DAI balance:", ethers.formatUnits(daiBefore, 18));
    console.log("  DexA price:", ethers.formatUnits(dexAPriceBefore, 18));
    console.log("  DexB price:", ethers.formatUnits(dexBPriceBefore, 18));

    // Create signature
    const nonce = 1;
    const signature = await createSignature(
      owner,
      DAI_ADDRESS,
      flashloanAmount,
      nonce,
      arb.target
    );

    // Execute flashloan with params
    const tx = await arb.requestFlashLoan(DAI_ADDRESS, flashloanAmount, maxSlippageBps, nonce, signature);
    await tx.wait();

    const daiAfter = await dai.balanceOf(arb.target);
    const dexAPriceAfter = await dexA.getPrice();
    const dexBPriceAfter = await dexB.getPrice();

    console.log("After:");
    console.log("  Arb DAI balance:", ethers.formatUnits(daiAfter, 18));
    console.log("  DexA price:", ethers.formatUnits(dexAPriceAfter, 18));
    console.log("  DexB price:", ethers.formatUnits(dexBPriceAfter, 18));

    expect(daiAfter).to.be.gt(daiBefore);
  });

  it("Should perform WETH → DAI → WETH arbitrage and make profit", async function () {
    await dai.connect(owner).approve(dexA.target, ethers.parseUnits("50000", 18));
    await weth.connect(owner).approve(dexA.target, ethers.parseUnits("25", 18));
    await dexA.connect(owner).addLiquidity(ethers.parseUnits("50000", 18), ethers.parseUnits("25", 18));

    const priceA = await dexA.getPrice();
    const priceB = await dexB.getPrice();
    console.log("DexA:", ethers.formatUnits(priceA, 18));
    console.log("DexB:", ethers.formatUnits(priceB, 18));

    const flashloanAmount = ethers.parseUnits("10", 18);
    const maxSlippageBps = 100;

    const wethBefore = await weth.balanceOf(arb.target);

    // Create signature
    const nonce = 1;
    const signature = await createSignature(
      owner,
      WETH_ADDRESS,
      flashloanAmount,
      nonce,
      arb.target
    );

    // Execute flashloan with params
    const tx = await arb.requestFlashLoan(WETH_ADDRESS, flashloanAmount, maxSlippageBps, nonce, signature);
    await tx.wait();

    const wethAfter = await weth.balanceOf(arb.target);
    console.log("WETH before:", ethers.formatUnits(wethBefore, 18));
    console.log("WETH after:", ethers.formatUnits(wethAfter, 18));

    expect(wethAfter).to.be.gt(wethBefore);
  });

  it("Should revert when arbitrage is not profitable", async function () {
    const priceABefore = await dexA.getPrice();
    const priceBBefore = await dexB.getPrice();
    console.log("DexA:", ethers.formatUnits(priceABefore, 18));
    console.log("DexB:", ethers.formatUnits(priceBBefore, 18));

    await dai.connect(owner).approve(dexA.target, ethers.parseUnits("50000", 18));
    await weth.connect(owner).approve(dexA.target, ethers.parseUnits("5", 18));
    await dexA.connect(owner).addLiquidity(ethers.parseUnits("50000", 18), ethers.parseUnits("5", 18));

    const priceA = await dexA.getPrice();
    const priceB = await dexB.getPrice();
    console.log("DexA:", ethers.formatUnits(priceA, 18));
    console.log("DexB:", ethers.formatUnits(priceB, 18));

    const flashloanAmount = ethers.parseUnits("10", 18);
    const maxSlippageBps = 100;

    // Create signature
    const nonce = 1;
    const signature = await createSignature(
      owner,
      WETH_ADDRESS,
      flashloanAmount,
      nonce,
      arb.target
    );

    await expect(
      arb.requestFlashLoan(WETH_ADDRESS, flashloanAmount, maxSlippageBps, nonce, signature)
    ).to.be.revertedWith("Arbitrage not profitable");
  });

});
