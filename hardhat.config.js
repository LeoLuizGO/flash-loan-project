import "@nomicfoundation/hardhat-ethers";
// import "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    // sources: "./contracts",
    tests: "./test",
    sources: "./contracts",
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      forking: {
        // Sua URL da Alchemy
        url: process.env.MAINNET_RPC_URL || "",
        blockNumber: 18000000, // Pin a block for consistency
      },
    },
  },
  mocha: {
    timeout: 100000, // Timeout para testes com fork
  },
};
