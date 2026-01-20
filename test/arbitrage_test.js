import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("Flashloan Arbitrage (DAI only)", function () {
  const POOL_ADDRESS_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";


  const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  // Example whale accounts
  const DAI_ACCOUNT = "0x28C6c06298d514Db089934071355E5743bf21d60";
  const WETH_ACCOUNT = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  let dai, weth;
  let signer, whaleDai, whaleWeth;
  let dexA, dexB;
  let arb;

  const DEX_A_PRICE = ethers.parseUnits("0.000333333333333333", 18);
  const DEX_B_PRICE = ethers.parseUnits("0.0004", 18);

  beforeEach(async function () {
    [signer] = await ethers.getSigners();

    // Get ERC20 contracts
    dai = await ethers.getContractAt("IERC20", DAI_ADDRESS);
    weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);

    // Impersonate whales
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [DAI_ACCOUNT],
    });
    whaleDai = await ethers.getSigner(DAI_ACCOUNT);

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WETH_ACCOUNT],
    });
    whaleWeth = await ethers.getSigner(WETH_ACCOUNT);

    // Deploy DexA and DexB
    const Dex = await ethers.getContractFactory("Dex");

    dexA = await Dex.deploy(DEX_A_PRICE);
    await dexA.waitForDeployment();

    dexB = await Dex.deploy(DEX_B_PRICE);
    await dexB.waitForDeployment();

    // Fund DexA and DexB with DAI and WETH
    const fundDAI = ethers.parseUnits("100000", 18);
    const fundWETH = ethers.parseUnits("50", 18);

    await dai.connect(whaleDai).transfer(await dexA.getAddress(), fundDAI);
    await weth.connect(whaleWeth).transfer(await dexA.getAddress(), fundWETH);

    await dai.connect(whaleDai).transfer(await dexB.getAddress(), fundDAI);
    await weth.connect(whaleWeth).transfer(await dexB.getAddress(), fundWETH);

    // Deploy Arbitrage contract
    const Arb = await ethers.getContractFactory("FlashLoan");
    arb = await Arb.deploy(POOL_ADDRESS_PROVIDER, await dexA.getAddress(), await dexB.getAddress());
    await arb.waitForDeployment();
  });

 it("Should perform DAI → WETH → DAI arbitrage via flashloan and make profit", async function () {
    const flashloanAmount = ethers.parseUnits("10000", 18);

    const daiBefore = await dai.balanceOf(arb.target);
    console.log("User DAI balance before arb:", ethers.formatUnits(daiBefore, 18));

    // Request a flashloan from the pool
    const tx = await arb.requestFlashLoan(DAI_ADDRESS, flashloanAmount);
    await tx.wait();

    const daiAfter = await dai.balanceOf(arb.target);
    console.log("User DAI balance after arb:", ethers.formatUnits(daiAfter, 18));

    expect(daiAfter).to.be.gt(daiBefore);

});

 it("Should revert when arbitrage is not profitable", async function () {
    // Same price on both DEXes → no arbitrage

    const Dex = await ethers.getContractFactory("Dex");

    const badDexA = await Dex.deploy(DEX_A_PRICE);
    await badDexA.waitForDeployment();

    const badDexB = await Dex.deploy(DEX_A_PRICE);
    await badDexB.waitForDeployment();

    // Fund both DEXes
    const fundDAI = ethers.parseUnits("100000", 18);
    const fundWETH = ethers.parseUnits("50", 18);

    await dai.connect(whaleDai).transfer(await badDexA.getAddress(), fundDAI);
    await weth.connect(whaleWeth).transfer(await badDexA.getAddress(), fundWETH);

    await dai.connect(whaleDai).transfer(await badDexB.getAddress(), fundDAI);
    await weth.connect(whaleWeth).transfer(await badDexB.getAddress(), fundWETH);

    // Deploy a new FlashLoan contract pointing to the bad DEXes
    const Arb = await ethers.getContractFactory("FlashLoan");
    const badArb = await Arb.deploy(
      POOL_ADDRESS_PROVIDER,
      await badDexA.getAddress(),
      await badDexB.getAddress()
    );
    await badArb.waitForDeployment();

    const flashloanAmount = ethers.parseUnits("10000", 18);

    // Expect revert due to lack of profit
    await expect(
      badArb.requestFlashLoan(DAI_ADDRESS, flashloanAmount)
    ).to.be.revertedWith("Arbitrage not profitable");

    console.log("✅ Arbitrage correctly reverted when not profitable");
});

 it("Should perform WETH → DAI → WETH arbitrage and make profit", async function () {

      await dexA.setPrice(ethers.parseUnits("0.00033333333", 18));
      await dexB.setPrice(ethers.parseUnits("0.00044444444", 18));

      const flashloanAmount = ethers.parseUnits("10", 18); // 10 WETH

      const wethBefore = await weth.balanceOf(arb.target);
      console.log("Arb WETH balance before:", ethers.formatEther(wethBefore));

      const tx = await arb.requestFlashLoan(WETH_ADDRESS, flashloanAmount);
      await tx.wait();

      const wethAfter = await weth.balanceOf(arb.target);
      console.log("Arb WETH balance after:", ethers.formatEther(wethAfter));

      expect(wethAfter).to.be.gt(wethBefore);
});
});
