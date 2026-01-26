// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

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
    IDex private dexA;
    IDex private dexB;
    IERC20 private dai;
    IERC20 private weth;

    constructor(address _addressProvider, address dex1Address, address dex2Address)
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider))
    {
        owner = payable(msg.sender);
        dexA = IDex(dex1Address);
        dexB = IDex(dex2Address);
        dai = IERC20(daiAddress);
        weth = IERC20(wethAddress);
    }

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


            if (dexAPrice > dexBPrice) {
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



                if (dexAPrice < dexBPrice) {
                    uint256 daiReserve = dexA.getDAIBalance();
                    uint256 wethReserve = dexA.getWETHBalance();
                    uint256 wethInWithFee = (wethAmount * 997) / 1000;
                    uint256 expectedDaiOut = (daiReserve * wethInWithFee) / (wethReserve + wethInWithFee);
                    uint256 minDaiOut = (expectedDaiOut * (10000 - maxSlippageBps)) / 10000;

                    daiReceived = dexA.buyDAI(wethAmount, minDaiOut);

                     daiReserve = dexB.getDAIBalance();
                     wethReserve = dexB.getWETHBalance();
                    uint256 daiInWithFee = (daiReceived * 997) / 1000;
                    uint256 expectedWethOut = (wethReserve * daiInWithFee) / (daiReserve + daiInWithFee);
                    uint256 minWethOut = (expectedWethOut * (10000 - maxSlippageBps)) / 10000;

                    dai.approve(address(dexB), daiReceived);
                    wethFinal = dexB.sellDAI(daiReceived, minWethOut);
                } else {
                    uint256 daiReserve = dexB.getDAIBalance();
                    uint256 wethReserve = dexB.getWETHBalance();
                    uint256 wethInWithFee = (wethAmount * 997) / 1000;
                    uint256 expectedDaiOut = (daiReserve * wethInWithFee) / (wethReserve + wethInWithFee);
                    uint256 minDaiOut = (expectedDaiOut * (10000 - maxSlippageBps)) / 10000;

                    daiReceived = dexB.buyDAI(wethAmount, minDaiOut);

                     daiReserve = dexA.getDAIBalance();
                     wethReserve = dexA.getWETHBalance();
                    uint256 daiInWithFee = (daiReceived * 997) / 1000;
                    uint256 expectedWethOut = (wethReserve * daiInWithFee) / (daiReserve + daiInWithFee);
                    uint256 minWethOut = (expectedWethOut * (10000 - maxSlippageBps)) / 10000;

                    dai.approve(address(dexA), daiReceived);
                    wethFinal = dexA.sellDAI(daiReceived, minWethOut);
                }
            uint256 totalDebt = wethAmount + premium;
            require(wethFinal >= totalDebt, "Arbitrage not profitable");

            weth.approve(address(POOL), totalDebt);

            }

        return true;
    }

    function requestFlashLoan(address _token, uint256 _amount, uint256  _maxSlippageBps) public {
        bytes memory params = abi.encode(_maxSlippageBps);
        POOL.flashLoanSimple(address(this), _token, _amount, params, 0);
    }

    function withdraw(address _tokenAddress) external {
        require(msg.sender == owner, "Only owner");
        IERC20(_tokenAddress).transfer(msg.sender, IERC20(_tokenAddress).balanceOf(address(this)));
    }

    receive() external payable {}
}
