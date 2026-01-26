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
        {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      }
    ],
  },
  paths: {
    // sources: "./contracts",
    tests: "./test",
    sources: "./contracts",
  },
  networks: {
    hardhat: {
      forking: {
        // Sua URL da Alchemy
        url: process.env.MAINNET_RPC_URL || "",
        blockNumber: 18000000, // Pin a block for consistency
      },
      // Set initial base fee to avoid gas price issues with mainnet fork
      initialBaseFeePerGas: 0,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  mocha: {
    timeout: 100000, // Timeout para testes com fork
  },
};
