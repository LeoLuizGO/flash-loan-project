import "@nomicfoundation/hardhat-toolbox-mocha-ethers";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: "0.8.10", // Mesma versão do seu contrato
  networks: {
    hardhat: {
      type: "edr-simulated",
      forking: {
        // Sua URL da Alchemy
        url: "https://eth-mainnet.g.alchemy.com/v2/S1ocqDpjtvIYumP_wTgs0",
      },
    },
  },
};
