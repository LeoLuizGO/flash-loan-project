const { ethers, network } = require("hardhat");

async function main() {
  console.log("🏦 Adicionando Liquidez aos DexAMMs...\n");

  // ============================================
  // CONFIGURAÇÃO
  // ============================================
  const FLASH_LOAN_ADDRESS = "0x64f5219563e28EeBAAd91Ca8D31fa3b36621FD4f"; // atualize se redeployar

  const DAI_ADDRESS  = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  // ============================================
  // PASSO 1: Pegar Owner + contratos
  // ============================================
  const [owner] = await ethers.getSigners();
  console.log("👤 Owner:", owner.address);

  const flash = await ethers.getContractAt("FlashLoanAMM", FLASH_LOAN_ADDRESS);

  const dexAAddr = await flash.dexA();
  const dexBAddr = await flash.dexB();

  console.log("dexA =", dexAAddr);
  console.log("dexB =", dexBAddr);

  const dexA = await ethers.getContractAt("DexAMM", dexAAddr);
  const dexB = await ethers.getContractAt("DexAMM", dexBAddr);

  const dai  = await ethers.getContractAt("IERC20", DAI_ADDRESS);
  const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);

  // ============================================
  // PASSO 2: Impersonate whales (Fork mainnet)
  // ============================================
  const DAI_WHALE  = "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503";
  const WETH_WHALE = "0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E";

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [DAI_WHALE],
  });
  const daiWhale = await ethers.getSigner(DAI_WHALE);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [WETH_WHALE],
  });
  const wethWhale = await ethers.getSigner(WETH_WHALE);

  // Dar ETH para gas pros whales
  await owner.sendTransaction({ to: DAI_WHALE,  value: ethers.parseEther("10") });
  await owner.sendTransaction({ to: WETH_WHALE, value: ethers.parseEther("10") });

  console.log("🐋 Whales impersonated\n");

  // ============================================
  // PASSO 3: Definir quantidades
  // ============================================
  const daiAmount1  = ethers.parseEther("100000"); // 100k DAI
  const wethAmount1 = ethers.parseEther("50");     // 50 WETH

  const daiAmount2  = ethers.parseEther("100000"); // 100k DAI
  const wethAmount2 = ethers.parseEther("45");     // 45 WETH (diferença)

  console.log("💰 Quantidades:");
  console.log("   DexA - DAI: 100,000 | WETH: 50");
  console.log("   DexB - DAI: 100,000 | WETH: 45\n");

  // ============================================
  // PASSO 4: Adicionar liquidez ao DexA
  // ============================================
  console.log("🔄 Adicionando liquidez ao DexA...");

  await dai.connect(daiWhale).approve(dexAAddr, daiAmount1);
  await weth.connect(wethWhale).approve(dexAAddr, wethAmount1);

  const tx1 = await dexA.connect(owner).addLiquidity(daiAmount1, wethAmount1);
  await tx1.wait();

  const price1      = await dexA.getPrice();
  const daiBalance1 = await dexA.getDAIBalance();
  const wethBalance1 = await dexA.getWETHBalance();

  console.log("✅ DexA:");
  console.log("   DAI:", ethers.formatEther(daiBalance1));
  console.log("   WETH:", ethers.formatEther(wethBalance1));
  console.log("   Preço:", ethers.formatEther(price1), "WETH/DAI\n");

  // ============================================
  // PASSO 5: Adicionar liquidez ao DexB
  // ============================================
  console.log("🔄 Adicionando liquidez ao DexB...");

  await dai.connect(daiWhale).approve(dexBAddr, daiAmount2);
  await weth.connect(wethWhale).approve(dexBAddr, wethAmount2);

  const tx2 = await dexB.connect(owner).addLiquidity(daiAmount2, wethAmount2);
  await tx2.wait();

  const price2      = await dexB.getPrice();
  const daiBalance2 = await dexB.getDAIBalance();
  const wethBalance2 = await dexB.getWETHBalance();

  console.log("✅ DexB:");
  console.log("   DAI:", ethers.formatEther(daiBalance2));
  console.log("   WETH:", ethers.formatEther(wethBalance2));
  console.log("   Preço:", ethers.formatEther(price2), "WETH/DAI\n");

  // ============================================
  // PASSO 6: Análise de arbitragem
  // ============================================
  const p1 = parseFloat(ethers.formatEther(price1));
  const p2 = parseFloat(ethers.formatEther(price2));
  const diffPercent = Math.abs(((p1 - p2) / p1) * 100).toFixed(2);

  console.log("🎯 ANÁLISE DE ARBITRAGEM:");
  console.log("=".repeat(50));

  if (p1 < p2) {
    console.log("💡 WETH mais barato no DexA");
    console.log("💡 WETH mais caro no DexB");
  } else {
    console.log("💡 WETH mais barato no DexB");
    console.log("💡 WETH mais caro no DexA");
  }
  console.log(`📊 Diferença: ${diffPercent}%`);
  console.log("=".repeat(50));
  console.log("✅ Liquidez adicionada com sucesso!");
  console.log("🚀 Agora você pode executar o flash loan no frontend!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
