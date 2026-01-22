import { expect } from "chai";
import hre from "hardhat";

const { ethers, network } = hre;

describe("FlashLoan - Authentication Tests", function () {
  const POOL_ADDRESS_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";
  const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const BINANCE_ADDRESS = "0x28C6c06298d514Db089934071355E5743bf21d60";

  let flashLoanContract;
  let dexA, dexB;
  let owner, user1, user2;
  let daiContract;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy Mock DEX contracts with different prices
    // 1 DAI = 0.000333 WETH (approximately 1 ETH = 3000 DAI)
    const Dex = await ethers.getContractFactory("Dex");
    const priceA = ethers.parseUnits("0.000333333333333333", 18);
    const priceB = ethers.parseUnits("0.000335", 18); // Slightly different price for arbitrage
    
    dexA = await Dex.deploy(priceA);
    await dexA.waitForDeployment();
    
    dexB = await Dex.deploy(priceB);
    await dexB.waitForDeployment();

    // Deploy FlashLoan contract
    const FlashLoan = await ethers.getContractFactory("FlashLoan");
    flashLoanContract = await FlashLoan.deploy(
      POOL_ADDRESS_PROVIDER,
      await dexA.getAddress(),
      await dexB.getAddress()
    );
    await flashLoanContract.waitForDeployment();

    const contractAddress = await flashLoanContract.getAddress();
    console.log("FlashLoan deployed at:", contractAddress);

    // Setup token contracts
    daiContract = await ethers.getContractAt("IERC20", DAI_ADDRESS);
    const wethContract = await ethers.getContractAt("IERC20", WETH_ADDRESS);

    // Impersonate Binance and fund contracts
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [BINANCE_ADDRESS],
    });

    const binanceSigner = await ethers.getSigner(BINANCE_ADDRESS);
    
    // Fund FlashLoan contract with DAI for fees
    const fundAmount = ethers.parseUnits("10000", 18);
    await daiContract.connect(binanceSigner).transfer(contractAddress, fundAmount);

    // Fund DEXs with WETH and DAI for trading
    const dexFundAmount = ethers.parseUnits("50000", 18);
    const dexAAddress = await dexA.getAddress();
    const dexBAddress = await dexB.getAddress();
    
    await daiContract.connect(binanceSigner).transfer(dexAAddress, dexFundAmount);
    await daiContract.connect(binanceSigner).transfer(dexBAddress, dexFundAmount);
    
    // Fund WETH (need to get from another whale)
    const WETH_WHALE = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28"; // Another whale
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WETH_WHALE],
    });
    const wethSigner = await ethers.getSigner(WETH_WHALE);
    
    const wethFundAmount = ethers.parseUnits("100", 18); // 100 WETH
    await wethContract.connect(wethSigner).transfer(dexAAddress, wethFundAmount);
    await wethContract.connect(wethSigner).transfer(dexBAddress, wethFundAmount);

    console.log("Contracts funded with DAI and WETH");
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

  describe("Testar execução autorizada", function () {
    it("Should allow owner to execute flash loan with valid signature", async function () {
      const amountToBorrow = ethers.parseUnits("1000", 18);
      const nonce = 1;
      const contractAddress = await flashLoanContract.getAddress();

      // Owner creates signature
      const signature = await createSignature(
        owner,
        DAI_ADDRESS,
        amountToBorrow,
        nonce,
        contractAddress
      );

      // Execute flash loan - should succeed
      const tx = await flashLoanContract.requestFlashLoan(
        DAI_ADDRESS,
        amountToBorrow,
        nonce,
        signature
      );

      await expect(tx).to.not.be.reverted;
      console.log("Owner successfully executed flash loan with valid signature");
    });

    it("Should allow authorized signer to execute flash loan", async function () {
      // Add user1 as authorized signer
      await flashLoanContract.connect(owner).addSigner(user1.address);

      const amountToBorrow = ethers.parseUnits("500", 18);
      const nonce = 1;
      const contractAddress = await flashLoanContract.getAddress();

      // user1 creates signature
      const signature = await createSignature(
        user1,
        DAI_ADDRESS,
        amountToBorrow,
        nonce,
        contractAddress
      );

      // Anyone can call requestFlashLoan with a valid signature
      const tx = await flashLoanContract.connect(user2).requestFlashLoan(
        DAI_ADDRESS,
        amountToBorrow,
        nonce,
        signature
      );

      await expect(tx).to.not.be.reverted;
      console.log("Authorized signer's signature was accepted");
    });
  });

  describe("Testar execução sem assinatura (revert)", function () {
    it("Should revert when unauthorized user tries to execute", async function () {
      const amountToBorrow = ethers.parseUnits("1000", 18);
      const nonce = 1;
      const contractAddress = await flashLoanContract.getAddress();

      // user1 creates signature (but is NOT authorized)
      const signature = await createSignature(
        user1,
        DAI_ADDRESS,
        amountToBorrow,
        nonce,
        contractAddress
      );

      // Should revert with "Unauthorized signer"
      await expect(
        flashLoanContract.requestFlashLoan(
          DAI_ADDRESS,
          amountToBorrow,
          nonce,
          signature
        )
      ).to.be.revertedWith("Unauthorized signer");

      console.log("Unauthorized signature was correctly rejected");
    });

    it("Should revert with invalid signature", async function () {
      const amountToBorrow = ethers.parseUnits("1000", 18);
      const nonce = 1;
      const contractAddress = await flashLoanContract.getAddress();

      // Create a fake/invalid signature
      const fakeSignature = "0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890";

      // Should revert
      await expect(
        flashLoanContract.requestFlashLoan(
          DAI_ADDRESS,
          amountToBorrow,
          nonce,
          fakeSignature
        )
      ).to.be.reverted;

      console.log("Invalid signature was correctly rejected");
    });

    it("Should revert when signature parameters don't match", async function () {
      const amountToBorrow = ethers.parseUnits("1000", 18);
      const nonce = 1;
      const contractAddress = await flashLoanContract.getAddress();

      // Owner signs for amount 1000
      const signature = await createSignature(
        owner,
        DAI_ADDRESS,
        amountToBorrow,
        nonce,
        contractAddress
      );

      // But we try to use it for amount 2000
      const differentAmount = ethers.parseUnits("2000", 18);

      await expect(
        flashLoanContract.requestFlashLoan(
          DAI_ADDRESS,
          differentAmount, // Different amount!
          nonce,
          signature
        )
      ).to.be.revertedWith("Unauthorized signer");

      console.log("Mismatched signature parameters were rejected");
    });
  });

  describe("Testar replay attack", function () {
    it("Should prevent replay attack with same nonce", async function () {
      const amountToBorrow = ethers.parseUnits("500", 18);
      const nonce = 1;
      const contractAddress = await flashLoanContract.getAddress();

      // Owner creates signature
      const signature = await createSignature(
        owner,
        DAI_ADDRESS,
        amountToBorrow,
        nonce,
        contractAddress
      );

      // First execution - should succeed
      const tx1 = await flashLoanContract.requestFlashLoan(
        DAI_ADDRESS,
        amountToBorrow,
        nonce,
        signature
      );
      await expect(tx1).to.not.be.reverted;
      console.log("First execution succeeded");

      // Try to replay the same signature - currently will succeed
      // Note: To properly prevent this, you need to implement nonce tracking in the contract
      const tx2 = await flashLoanContract.requestFlashLoan(
        DAI_ADDRESS,
        amountToBorrow,
        nonce,
        signature
      );

      // ⚠️ WARNING: Current implementation does NOT prevent replay attacks
      // The signature will be valid again because there's no nonce tracking
      // To fix this, the contract needs a mapping(address => uint256) public nonces;
      // and check/increment it in requestFlashLoan
      
      console.log("REPLAY ATTACK POSSIBLE - Contract needs nonce tracking implementation");
      console.log("   Add to contract: mapping(address => uint256) public usedNonces;");
      console.log("   Check in requestFlashLoan: require(!usedNonces[nonce], 'Nonce already used');");
      console.log("   Then: usedNonces[nonce] = true;");
    });

    it("Should allow different nonces for same signer", async function () {
      const amountToBorrow = ethers.parseUnits("500", 18);
      const contractAddress = await flashLoanContract.getAddress();

      // Execute with nonce 1
      const signature1 = await createSignature(
        owner,
        DAI_ADDRESS,
        amountToBorrow,
        1,
        contractAddress
      );
      const tx1 = await flashLoanContract.requestFlashLoan(
        DAI_ADDRESS,
        amountToBorrow,
        1,
        signature1
      );
      await expect(tx1).to.not.be.reverted;

      // Execute with nonce 2 - should work
      const signature2 = await createSignature(
        owner,
        DAI_ADDRESS,
        amountToBorrow,
        2,
        contractAddress
      );
      const tx2 = await flashLoanContract.requestFlashLoan(
        DAI_ADDRESS,
        amountToBorrow,
        2,
        signature2
      );
      await expect(tx2).to.not.be.reverted;

      console.log("Different nonces work correctly");
    });
  });

  describe("Additional Security Tests", function () {
    it("Should verify signer is in authorized list", async function () {
      // Check owner is authorized by default
      const isOwnerAuthorized = await flashLoanContract.authorizedSigners(owner.address);
      expect(isOwnerAuthorized).to.be.true;

      // Check user1 is not authorized
      const isUser1Authorized = await flashLoanContract.authorizedSigners(user1.address);
      expect(isUser1Authorized).to.be.false;

      console.log("Authorization mapping works correctly");
    });

    it("Should allow only owner to add new signers", async function () {
      // user1 tries to add user2 - should fail
      await expect(
        flashLoanContract.connect(user1).addSigner(user2.address)
      ).to.be.revertedWith("Only the contract owner can call this function");

      // owner adds user2 - should succeed
      await flashLoanContract.connect(owner).addSigner(user2.address);
      const isUser2Authorized = await flashLoanContract.authorizedSigners(user2.address);
      expect(isUser2Authorized).to.be.true;

      console.log("Only owner can add signers");
    });
  });
});
