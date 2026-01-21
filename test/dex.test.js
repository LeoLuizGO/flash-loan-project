import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("Dex", function () {
  const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const DAI_ACCOUNT = "0x28C6c06298d514Db089934071355E5743bf21d60";
  const WETH_ACCOUNT = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"



  let dex, dai, weth;
  let signer, whaleDai, whaleWeth;

  // 1 ETH = 3000 DAI example
  const DAI_WETH_PRICE = ethers.parseUnits("0.000333333333333333", 18);

  beforeEach(async function () {
    [signer] = await ethers.getSigners();

    dai = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    DAI_ADDRESS
  );

    weth = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    WETH_ADDRESS
  );

    // Impersonate DAI whale
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

    // Deploy DEX contract
    const Dex = await ethers.getContractFactory("Dex");
    dex = await Dex.deploy(DAI_WETH_PRICE);
    await dex.waitForDeployment();

  });

  it("Test Dex getter and setter functions", async function(){
    console.log("Balances for Dex:");
    const daiBalance = await dex.getDAIBalance();
    console.log("Dai Balance:", daiBalance);
    expect(daiBalance).to.equal(0n);
    console.log("✓ DAI balance OK");

    const wethBalance = await dex.getWETHBalance();
    console.log("WETH Balance:", wethBalance);
    expect(wethBalance).to.equal(0n);
    console.log("✓ WETH balance OK");

    // Fiquei com preguica de faze certinho, ent parei com os expect()
    const priceBefore = await dex.getPrice();
    console.log("1 DAI equals", ethers.formatUnits(priceBefore, 18), "WETH");

    await dex.setPrice(ethers.parseUnits("0.000444", 18));

    const priceAfter = await dex.getPrice();

    console.log("Price changed, 1 DAI equals", ethers.formatUnits(priceAfter, 18), "WETH");
  });

  it("Test Funding the Account", async function () {
    const daiBalance = await dex.getDAIBalance();
    console.log("Dai Balance:", daiBalance);

    const fundDai = ethers.parseUnits("100000", 18);

    await dai.connect(whaleDai).transfer(await dex.getAddress(), fundDai);

    const newDAIBalance = await dex.getDAIBalance();
    console.log("New Dai Balance:", newDAIBalance);


    const wethBalance = await dex.getWETHBalance();
    console.log("WETH Balance in WEI:", wethBalance);
    console.log("WETH balance in ETH:", ethers.formatEther(wethBalance), "ETH");


    const fundWeth = ethers.parseUnits("50", 18);
    await weth.connect(whaleWeth).transfer(await dex.getAddress(), fundWeth);
    const newWETHBalance = await dex.getWETHBalance();
    console.log("New WETH Balance in WEI:", newWETHBalance);
    console.log("New WETH balance in ETH:", ethers.formatEther(newWETHBalance), "ETH");

  });


  it("DEX buys WETH, pays with day", async function () {
    // const whaleBalance = await weth.balanceOf(whaleWeth.address);
    // console.log("Whale WETH balance:", ethers.formatEther(whaleBalance), "ETH");

    const fundWeth = ethers.parseUnits("600", 18);
    await weth.connect(whaleWeth).transfer(await dex.getAddress(), fundWeth);
    const WETHBalance = await dex.getWETHBalance();
    console.log("DEX New WETH Balance:", WETHBalance);

    console.log("DEX ETH balance:", ethers.formatEther(WETHBalance), "ETH");

    const daiAmount = ethers.parseUnits("10000", 18);

    await dai.connect(whaleDai).transfer(signer.address, daiAmount);
    const DAIBalance = await dai.balanceOf(signer.address);
    console.log("User DAI Balance Before buying WETH:", ethers.formatUnits(DAIBalance, 18), "DAI");

    await dai.connect(signer).approve(await dex.getAddress(), daiAmount);

    const wethBefore = await weth.balanceOf(signer.address);
    console.log("User ETH balance before buying:", ethers.formatEther(wethBefore), "ETH");

    const dexDaiBefore = await dex.getDAIBalance();
    const dexWethBefore = await dex.getWETHBalance();
    console.log("DEX DAI balance before trade:", ethers.formatUnits(dexDaiBefore, 18), "DAI");
    console.log("DEX WETH balance before trade:", ethers.formatEther(dexWethBefore), "ETH");

    await dex.connect(signer).buyWETH(daiAmount);

    const wethAfter = await weth.balanceOf(signer.address);
    expect(wethAfter).to.be.gt(wethBefore);
    console.log("User ETH balance after buying:", ethers.formatEther(wethAfter), "ETH");

    const newDAIBalance = await dai.balanceOf(signer.address);
    console.log("User Dai Balance After buying WETH:", ethers.formatUnits(newDAIBalance, 18), "DAI");

    const dexDaiAfter = await dex.getDAIBalance();
    const dexWethAfter = await dex.getWETHBalance();
    console.log("DEX DAI balance after trade:", ethers.formatUnits(dexDaiAfter, 18), "DAI");
    console.log("DEX WETH balance after trade:", ethers.formatEther(dexWethAfter), "ETH");
  });
it("DEX buys DAI, pays WETH to user", async function () {
  const fundWeth = ethers.parseUnits("50", 18);
  await weth.connect(whaleWeth).transfer(await dex.getAddress(), fundWeth);

  const dexDaiBefore = await dex.getDAIBalance();
  const dexWethBefore = await dex.getWETHBalance();

  const daiAmount = ethers.parseUnits("10000", 18);
  await dai.connect(whaleDai).transfer(signer.address, daiAmount);

  const daiBefore = await dai.balanceOf(signer.address);

  const wethBefore = await weth.balanceOf(signer.address);

  await dai.connect(signer).approve(await dex.getAddress(), daiAmount);

  await dex.connect(signer).sellDAI(daiAmount);

  const daiAfter = await dai.balanceOf(signer.address);
  const wethAfter = await weth.balanceOf(signer.address);
  console.log("User DAI balance before trade:", ethers.formatUnits(daiBefore, 18), "DAI");
  console.log("User DAI balance after trade:", ethers.formatUnits(daiAfter, 18), "DAI");

  console.log("User WETH balance before trade:", ethers.formatEther(wethBefore), "ETH");
  console.log("User WETH balance after trade:", ethers.formatEther(wethAfter), "ETH");

  const dexDaiAfter = await dex.getDAIBalance();
  const dexWethAfter = await dex.getWETHBalance();
  console.log("DEX DAI balance before trade:", ethers.formatUnits(dexDaiBefore, 18), "DAI");
  console.log("DEX DAI balance after trade:", ethers.formatUnits(dexDaiAfter, 18), "DAI");

  console.log("DEX WETH balance before trade:", ethers.formatEther(dexWethBefore), "ETH");
  console.log("DEX WETH balance after trade:", ethers.formatEther(dexWethAfter), "ETH");

});





  //
  // it("Should buy DAI using WETH (alias function)", async function () {
  //   const wethAmount = ethers.parseUnits("0.5", 18);
  //
  //   // Give signer some WETH
  //   await weth.connect(whaleWeth).transfer(signer.address, wethAmount);
  //
  //   // Approve DEX
  //   await weth.connect(signer).approve(await dex.getAddress(), wethAmount);
  //
  //   const daiBefore = await dai.balanceOf(signer.address);
  //
  //   await dex.connect(signer).buyDAI(wethAmount);
  //
  //   const daiAfter = await dai.balanceOf(signer.address);
  //   expect(daiAfter).to.be.gt(daiBefore);
  //
  //   console.log(
  //     "Bought DAI using WETH. Received:",
  //     ethers.formatUnits(daiAfter.sub(daiBefore), 18)
  //   );
  // });
  //
  // it("Should sell DAI for WETH (alias function)", async function () {
  //   const daiAmount = ethers.parseUnits("500", 18);
  //
  //   // Give signer some DAI
  //   await dai.connect(whaleDai).transfer(signer.address, daiAmount);
  //
  //   // Approve DEX
  //   await dai.connect(signer).approve(await dex.getAddress(), daiAmount);
  //
  //   const wethBefore = await weth.balanceOf(signer.address);
  //
  //   await dex.connect(signer).sellDAI(daiAmount);
  //
  //   const wethAfter = await weth.balanceOf(signer.address);
  //   expect(wethAfter).to.be.gt(wethBefore);
  //
  //   console.log(
  //     "Sold DAI for WETH. Received:",
  //     ethers.formatUnits(wethAfter.sub(wethBefore), 18)
  //   );
  // });
});
