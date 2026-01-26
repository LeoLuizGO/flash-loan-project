// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

/**
 * @title FlashLoanAMM
 * @notice Flash Loan com arbitragem AMM + autenticação criptográfica
 * @dev INSA Lyon - Blockchain Course
 * 
 * Features:
 * - Flash Loan do Aave V3
 * - Arbitragem entre 2 DexAMMs
 * - Slippage protection
 * - Autenticação EIP-712
 * - Proteção contra replay attacks
 */

interface IDex {
    function buyWETH(uint256 daiAmount, uint256 minWethOut) external returns (uint256);
    function sellWETH(uint256 wethAmount, uint256 minDaiOut) external returns (uint256);
    function buyDAI(uint256 wethAmount, uint256 minDaiOut) external returns (uint256);
    function sellDAI(uint256 daiAmount, uint256 minWethOut) external returns (uint256);
    function getPrice() external view returns (uint256);
    function getDAIBalance() external view returns (uint256);
    function getWETHBalance() external view returns (uint256);
}

contract FlashLoanAMM is FlashLoanSimpleReceiverBase {

    address private immutable daiAddress = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address private immutable wethAddress = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    address payable public owner;
    IDex public dexA;
    IDex public dexB;
    IERC20 private dai;
    IERC20 private weth;

    mapping(address => bool) public authorizedSigners;
    mapping(bytes32 => bool) public usedSignatures;

    constructor(address _addressProvider, address dex1Address, address dex2Address)
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider))
    {
        owner = payable(msg.sender);
        dexA = IDex(dex1Address);
        dexB = IDex(dex2Address);
        dai = IERC20(daiAddress);
        weth = IERC20(wethAddress);

        authorizedSigners[owner] = true;
    }

    /**
     * @notice Executa arbitragem com slippage protection
     * @dev Chamado automaticamente pelo Aave Pool após receber flash loan
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address /*initiator*/,
        bytes calldata params
    ) external override returns (bool) {

        uint256 maxSlippageBps = abi.decode(params, (uint256));

        // DAI -> WETH -> DAI
        if (asset == daiAddress) {
            uint256 daiAmount = amount;

            dai.approve(address(dexA), daiAmount);
            dai.approve(address(dexB), daiAmount);

            uint256 dexAPrice = dexA.getPrice();
            uint256 dexBPrice = dexB.getPrice();

            uint256 wethReceived;
            uint256 daiFinal;

            // Price = WETH per DAI (quanto WETH você recebe por 1 DAI)
            // Preço MAIOR = WETH mais BARATO (recebe mais WETH por DAI)
            // Estratégia: Comprar onde preço é MAIOR, vender onde preço é MENOR
            if (dexAPrice > dexBPrice) {
                // WETH mais BARATO na DEX A (comprar aqui)
                // WETH mais CARO na DEX B (vender aqui)
                uint256 daiReserve = dexA.getDAIBalance();
                uint256 wethReserve = dexA.getWETHBalance();
                uint256 daiInWithFee = (daiAmount * 997) / 1000;
                uint256 expectedWethOut = (wethReserve * daiInWithFee) / (daiReserve + daiInWithFee);
                uint256 minWethOut = (expectedWethOut * (10000 - maxSlippageBps)) / 10000;

                wethReceived = dexA.buyWETH(daiAmount, minWethOut);

                daiReserve = dexB.getDAIBalance();
                wethReserve = dexB.getWETHBalance();
                uint256 wethInWithFee = (wethReceived * 997) / 1000;
                uint256 expectedDaiOut = (daiReserve * wethInWithFee) / (wethReserve + wethInWithFee);
                uint256 minDaiOut = (expectedDaiOut * (10000 - maxSlippageBps)) / 10000;

                weth.approve(address(dexB), wethReceived);
                daiFinal = dexB.sellWETH(wethReceived, minDaiOut);
            } else {
                // WETH mais BARATO na DEX B (comprar aqui)
                // WETH mais CARO na DEX A (vender aqui)
                uint256 daiReserve = dexB.getDAIBalance();
                uint256 wethReserve = dexB.getWETHBalance();
                uint256 daiInWithFee = (daiAmount * 997) / 1000;
                uint256 expectedWethOut = (wethReserve * daiInWithFee) / (daiReserve + daiInWithFee);
                uint256 minWethOut = (expectedWethOut * (10000 - maxSlippageBps)) / 10000;

                wethReceived = dexB.buyWETH(daiAmount, minWethOut);

                daiReserve = dexA.getDAIBalance();
                wethReserve = dexA.getWETHBalance();
                uint256 wethInWithFee = (wethReceived * 997) / 1000;
                uint256 expectedDaiOut = (daiReserve * wethInWithFee) / (wethReserve + wethInWithFee);
                uint256 minDaiOut = (expectedDaiOut * (10000 - maxSlippageBps)) / 10000;

                weth.approve(address(dexA), wethReceived);
                daiFinal = dexA.sellWETH(wethReceived, minDaiOut);
            }

            uint256 totalDebt = daiAmount + premium;
            require(daiFinal >= totalDebt, "Arbitrage not profitable");

            dai.approve(address(POOL), totalDebt);
        }
        // WETH -> DAI -> WETH
        else if (asset == wethAddress) {
            uint256 wethAmount = amount;

            weth.approve(address(dexA), wethAmount);
            weth.approve(address(dexB), wethAmount);

            uint256 dexAPrice = dexA.getPrice();
            uint256 dexBPrice = dexB.getPrice();

            uint256 daiReceived;
            uint256 wethFinal;

            // Price = WETH per DAI
            // Preço BAIXO = DAI vale MAIS (recebe menos WETH por DAI)
            // Estratégia: Vender WETH onde preço é BAIXO (recebe mais DAI), comprar onde é ALTO
            if (dexAPrice < dexBPrice) {
                // DexA: preço BAIXO (DAI vale mais aqui) - VENDER WETH aqui
                // DexB: preço ALTO (DAI vale menos) - COMPRAR WETH aqui
                uint256 daiReserve = dexA.getDAIBalance();
                uint256 wethReserve = dexA.getWETHBalance();
                uint256 wethInWithFee = (wethAmount * 997) / 1000;
                uint256 expectedDaiOut = (daiReserve * wethInWithFee) / (wethReserve + wethInWithFee);
                uint256 minDaiOut = (expectedDaiOut * (10000 - maxSlippageBps)) / 10000;

                daiReceived = dexA.sellWETH(wethAmount, minDaiOut);

                daiReserve = dexB.getDAIBalance();
                wethReserve = dexB.getWETHBalance();
                uint256 daiInWithFee = (daiReceived * 997) / 1000;
                uint256 expectedWethOut = (wethReserve * daiInWithFee) / (daiReserve + daiInWithFee);
                uint256 minWethOut = (expectedWethOut * (10000 - maxSlippageBps)) / 10000;

                dai.approve(address(dexB), daiReceived);
                wethFinal = dexB.buyWETH(daiReceived, minWethOut);
            } else {
                // DexB: preço BAIXO (DAI vale mais aqui) - VENDER WETH aqui  
                // DexA: preço ALTO (DAI vale menos) - COMPRAR WETH aqui
                uint256 daiReserve = dexB.getDAIBalance();
                uint256 wethReserve = dexB.getWETHBalance();
                uint256 wethInWithFee = (wethAmount * 997) / 1000;
                uint256 expectedDaiOut = (daiReserve * wethInWithFee) / (wethReserve + wethInWithFee);
                uint256 minDaiOut = (expectedDaiOut * (10000 - maxSlippageBps)) / 10000;

                daiReceived = dexB.sellWETH(wethAmount, minDaiOut);

                daiReserve = dexA.getDAIBalance();
                wethReserve = dexA.getWETHBalance();
                uint256 daiInWithFee = (daiReceived * 997) / 1000;
                uint256 expectedWethOut = (wethReserve * daiInWithFee) / (daiReserve + daiInWithFee);
                uint256 minWethOut = (expectedWethOut * (10000 - maxSlippageBps)) / 10000;

                dai.approve(address(dexA), daiReceived);
                wethFinal = dexA.buyWETH(daiReceived, minWethOut);
            }
            
            uint256 totalDebt = wethAmount + premium;
            require(wethFinal >= totalDebt, "Arbitrage not profitable");

            weth.approve(address(POOL), totalDebt);
        }

        return true;
    }

    function addSigner(address _signer) external onlyOwner {
        authorizedSigners[_signer] = true;
    }

    function requestFlashLoan(address _token, uint256 _amount, uint256  _maxSlippageBps, uint256 _nonce, bytes memory _signature) public {
        bytes32 messageHash = keccak256(abi.encodePacked(
            _token,
            _amount, 
            _nonce,
            address(this)
        ));
        bytes32 ethSignedHash = getEthSignedMessageHash(messageHash);
        address signer = recoverSigner(ethSignedHash, _signature);

        require(!usedSignatures[ethSignedHash], "Signature already used");
        require(authorizedSigners[signer], "Unauthorized signer");

        bytes memory params = abi.encode(_maxSlippageBps);
        POOL.flashLoanSimple(address(this), _token, _amount, params, 0);
    
        usedSignatures[ethSignedHash] = true;
    }

    function getEthSignedMessageHash(bytes32 _messageHash) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash));
    }

    function recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes memory _signature
    ) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig)
        public
        pure
        returns (
            bytes32 r,
            bytes32 s,
            uint8 v
        )
    {
        require(sig.length == 65, "invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
 
    function withdraw(address _tokenAddress) external onlyOwner {
        IERC20(_tokenAddress).transfer(msg.sender, IERC20(_tokenAddress).balanceOf(address(this)));
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only the contract owner can call this function"
        );
        _;
    }

    receive() external payable {}
}
