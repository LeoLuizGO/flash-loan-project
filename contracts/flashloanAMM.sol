// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

interface IDex {
    function buyWETH(uint256 daiAmount) external returns (uint256);
    function sellWETH(uint256 wethAmount) external returns (uint256);
    function buyDAI(uint256 wethAmount) external returns (uint256);
    function sellDAI(uint256 daiAmount) external returns (uint256);
    function getPrice() external view returns (uint256);
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
        bytes calldata /*params*/
    ) external override returns (bool) {

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
                // buy WETH on DexA
                wethReceived = dexA.buyWETH(daiAmount);
                weth.approve(address(dexB), wethReceived);
                daiFinal = dexB.sellWETH(wethReceived);

            } else {
                wethReceived = dexB.buyWETH(daiAmount);
                weth.approve(address(dexA), wethReceived);
                daiFinal = dexA.sellWETH(wethReceived);
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
                    daiReceived = dexA.buyDAI(wethAmount);
                    dai.approve(address(dexB), daiReceived);
                    wethFinal = dexB.sellDAI(daiReceived);
                } else {
                    daiReceived = dexB.buyDAI(wethAmount);
                    dai.approve(address(dexA), daiReceived);
                    wethFinal = dexA.sellDAI(daiReceived);
                }
            uint256 totalDebt = wethAmount + premium;
            require(wethFinal >= totalDebt, "Arbitrage not profitable");

            weth.approve(address(POOL), totalDebt);

            }

        return true;
    }

    function requestFlashLoan(address _token, uint256 _amount) public {
        POOL.flashLoanSimple(address(this), _token, _amount, "", 0);
    }

    function withdraw(address _tokenAddress) external {
        require(msg.sender == owner, "Only owner");
        IERC20(_tokenAddress).transfer(msg.sender, IERC20(_tokenAddress).balanceOf(address(this)));
    }

    receive() external payable {}
}
