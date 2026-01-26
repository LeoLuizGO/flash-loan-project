import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("DexAMM", function () {
  const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  const DAI_WHALE = "0x28C6c06298d514Db089934071355E5743bf21d60";
  const WETH_WHALE = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  let dex, dai, weth;
  let owner, daiWhale, wethWhale, user;

  beforeEach(async function () {

    // Reset the previous transactions, was having issues with whale running out of dai
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [{
        forking: {
          jsonRpcUrl: process.env.MAINNET_RPC_URL,
          blockNumber: 18000000
        }
      }]
    });

    [owner, user] = await ethers.getSigners();

    dai = await ethers.getContractAt(
      "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol:IERC20",
      DAI_ADDRESS
    );

    weth = await ethers.getContractAt(
      "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol:IERC20",
      WETH_ADDRESS
    );

    // Impersonate whales
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

    // Deploy DexAMM
    const DexAMM = await ethers.getContractFactory("DexAMM");
    dex = await DexAMM.deploy();
    await dex.waitForDeployment();

    // Only owner can give liquidity to the dex, so fund the owner
    await dai.connect(daiWhale).transfer(owner.address, ethers.parseUnits("200000", 18));
    await weth.connect(wethWhale).transfer(owner.address, ethers.parseUnits("100", 18));

    // Approve and add liquidity
    await dai.connect(owner).approve(dex.target, ethers.parseUnits("100000", 18));
    await weth.connect(owner).approve(dex.target, ethers.parseUnits("50", 18));

    await dex.connect(owner).addLiquidity(
      ethers.parseUnits("100000", 18),
      ethers.parseUnits("50", 18)
    );
  });

  it("Should initialize reserves correctly", async function () {
    const daiReserves = await dex.daiBalance();
    const wethReserves = await dex.wethBalance();

    expect(daiReserves).to.equal(ethers.parseUnits("100000", 18));
    expect(wethReserves).to.equal(ethers.parseUnits("50", 18));
  });

  it("Should return a valid spot price", async function () {
    const price = await dex.getPrice();
    console.log("Spot price (WETH per DAI):", ethers.formatUnits(price, 18));

    expect(price).to.be.gt(0n);
  });

  it("Should swap DAI → WETH with slippage", async function () {
    const daiIn = ethers.parseUnits("1000", 18);

    await dai.connect(daiWhale).transfer(user.address, daiIn);
    await dai.connect(user).approve(dex.target, daiIn);

    const dexDaiBefore = await dex.getDAIBalance();
    const dexWethBefore = await dex.getWETHBalance();
    const priceBefore = await dex.getPrice()

    const wethBefore = await weth.balanceOf(user.address);

    // ✅ UPDATED: minWethOut = 0
    await dex.connect(user).buyWETH(daiIn, 0);

    const wethAfter = await weth.balanceOf(user.address);

    const dexDaiAfter = await dex.getDAIBalance();
    const dexWethAfter = await dex.getWETHBalance();
    const priceAfter = await dex.getPrice();

    console.log("WETH received:", ethers.formatEther(wethAfter - wethBefore));
    console.log("DEX reserves DAI:", ethers.formatUnits(dexDaiBefore, 18), "→", ethers.formatUnits(dexDaiAfter, 18));
    console.log("DEX reserves WETH:", ethers.formatEther(dexWethBefore), "→", ethers.formatEther(dexWethAfter));
    console.log("Price:", ethers.formatUnits(priceBefore, 18), "→", ethers.formatUnits(priceAfter, 18));

    expect(wethAfter).to.be.gt(wethBefore);
  });

  it("Should swap WETH → DAI with slippage", async function () {
    const wethIn = ethers.parseUnits("1", 18);

    await weth.connect(wethWhale).transfer(user.address, wethIn);
    await weth.connect(user).approve(dex.target, wethIn);

    const daiBefore = await dai.balanceOf(user.address);

    // ✅ UPDATED: minDaiOut = 0
    await dex.connect(user).sellWETH(wethIn, 0);

    const daiAfter = await dai.balanceOf(user.address);

    console.log(
      "DAI received:",
      ethers.formatUnits(daiAfter - daiBefore, 18)
    );

    expect(daiAfter).to.be.gt(daiBefore);
  });

  it("Price should move after a trade (AMM behavior)", async function () {
    const priceBefore = await dex.getPrice();

    const daiIn = ethers.parseUnits("5000", 18);
    await dai.connect(daiWhale).transfer(user.address, daiIn);
    await dai.connect(user).approve(dex.target, daiIn);

    // ✅ UPDATED: minWethOut = 0
    await dex.connect(user).buyWETH(daiIn, 0);

    const priceAfter = await dex.getPrice();

    console.log("Price before:", ethers.formatUnits(priceBefore, 18));
    console.log("Price after:", ethers.formatUnits(priceAfter, 18));

    expect(priceAfter).to.not.equal(priceBefore);
  });

  it("Should revert when slippage protection triggers", async function () {
  const daiIn = ethers.parseUnits("1000", 18);

  await dai.connect(daiWhale).transfer(user.address, daiIn);
  await dai.connect(user).approve(dex.target, daiIn);

  // Set minWethOut to an absurdly high value
  const unrealisticMinWethOut = ethers.parseUnits("10", 18);

  await expect(
    dex.connect(user).buyWETH(daiIn, unrealisticMinWethOut)
  ).to.be.reverted;
});



});
