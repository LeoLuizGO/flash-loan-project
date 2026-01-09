import { expect } from "chai";
import hre from "hardhat";

// Extraímos o ethers e network do objeto Hardhat Runtime Environment (hre)
const { ethers, network } = hre;

describe("FlashLoan", function () {
    let flashLoanContract;
    const POOL_ADDRESS_PROVIDER = "0x67D8B0577e0635919DA8AFE917E568C3F19Dd27e"; // Aave V3 Mainnet
    const DAI_ADDRESS = "0x67D8B0577e0635919DA8AFE917E568C3F19Dd27e"; 
    const BINANCE_ADDRESS = "0x67D8B0577e0635919DA8AFE917E568C3F19Dd27e"; // Baleia de DAI

    it("Deve executar um flash loan e pagar a taxa", async function () {
        // 1. Deploy do contrato
        const FlashLoan = await ethers.getContractFactory("FlashLoan");
        flashLoanContract = await FlashLoan.deploy(POOL_ADDRESS_PROVIDER);
        await flashLoanContract.waitForDeployment();
        
        const contractAddress = await flashLoanContract.getAddress();
        console.log("Contrato deployado em:", contractAddress);

        // 2. Impersonate Account (Pegar DAI da Binance para cobrir a taxa)
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [BINANCE_ADDRESS],
        });
        const binanceSigner = await ethers.getSigner(BINANCE_ADDRESS);
        
        // Conecta ao contrato do DAI
        const daiContract = await ethers.getContractAt(
            "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", 
            DAI_ADDRESS
        );

        // Envia 1000 DAI para o contrato cobrir a taxa (premium)
        const amountTax = ethers.parseUnits("1000", 18);
        await daiContract.connect(binanceSigner).transfer(contractAddress, amountTax);
        
        console.log("Taxa enviada ao contrato com sucesso!");

        // 3. Execução do Flash Loan
        const amountToBorrow = ethers.parseUnits("10000", 18); // Pede 10.000 DAI
        console.log("Solicitando flash loan de 10.000 DAI...");

        const tx = await flashLoanContract.requestFlashLoan(DAI_ADDRESS, amountToBorrow);
        const receipt = await tx.wait();

        console.log("Flash Loan executado! Hash:", receipt.hash);
        
        expect(receipt.status).to.equal(1);
    });
});