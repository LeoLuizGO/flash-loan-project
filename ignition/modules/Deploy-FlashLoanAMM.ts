import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AAVE_POOL_ADDRESS_PROVIDER_MAINNET = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";

export default buildModule("FlashLoanAMMModule", (m) => {
  
  // 1. Deploy DexAMM #1
  const dexAMM1 = m.contract("DexAMM", [], {
    id: "DexAMM1"
  });

  // 2. Deploy DexAMM #2
  const dexAMM2 = m.contract("DexAMM", [], {
    id: "DexAMM2"
  });

  // 3. Deploy FlashLoanAMM
  const flashLoanAMM = m.contract("FlashLoanAMM", [
    AAVE_POOL_ADDRESS_PROVIDER_MAINNET,
    dexAMM1,
    dexAMM2
  ]);

  return { dexAMM1, dexAMM2, flashLoanAMM };
});
