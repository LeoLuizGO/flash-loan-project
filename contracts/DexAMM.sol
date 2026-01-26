// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

contract DexAMM {



    //3️⃣ Max trade size (anti-flash-loan)
    address payable public owner;

    address private immutable daiAddress = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address private immutable wethAddress = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;


    IERC20 private dai; // worth around 1 USD
    IERC20 private weth; // worth 1 ETH

    // variables to simulate 0.3% fee like Uniswap
    uint256 private constant FEE_NUMERATOR = 997;
    uint256 private constant FEE_DENOMINATOR = 1000;


    // token reservers to calculate price dynamically
    uint256 public daiBalance;
    uint256 public wethBalance;

//    //Balances of the tokens
//    mapping(address => uint256) public daiBalances;
//    mapping(address => uint256) public wethBalances;

    bool private locked;

    modifier nonReentrant() {
        require(!locked, "Reentrancy blocked");
        locked = true;
        _;
        locked = false;
    }

     modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = payable(msg.sender);
        dai = IERC20(daiAddress);
        weth = IERC20(wethAddress);
    }

    // Implementation of Liquidity
    function addLiquidity(uint256 daiAmount, uint256 wethAmount) external onlyOwner {
        require(daiAmount > 0 && wethAmount > 0, "Invalid amounts");

        dai.transferFrom(msg.sender, address(this), daiAmount);
        weth.transferFrom(msg.sender, address(this), wethAmount);

        daiBalance += daiAmount;
        wethBalance += wethAmount;
    }

    // Avoid misalignment of variables (why did i put this here?)
//    function sync() public {
//        daiBalance = dai.balanceOf(address(this));
//        wethBalance = weth.balanceOf(address(this));
//    }


    //Buy WETH using DAI
    function buyWETH(uint256 daiIn, uint256 minWethOut) public nonReentrant returns (uint256 wethOut) {
        require(daiIn > 0, "No dai was given");

        //Already deduct the fee
        uint256 daiInWithFee = (daiIn * FEE_NUMERATOR) / FEE_DENOMINATOR;

        // Calculate price dynamically
        wethOut = (wethBalance * daiInWithFee) / (daiBalance + daiInWithFee);


        require(wethOut >= minWethOut, "Slippage too high");
        require(wethOut <= wethBalance, "Dex does not have enough weth");


        // Update the balances
        daiBalance += daiIn;
        wethBalance -= wethOut;

        dai.transferFrom(msg.sender, address(this), daiIn);
        weth.transfer(msg.sender, wethOut);

        return wethOut;
    }

    // Sell WETH for DAI
    function sellWETH(uint256 wethIn, uint256 minDaiOut) public nonReentrant returns (uint256 daiOut) {
        require(wethIn > 0, "No weth was given");

        // Already deduct the fee
        uint256 wethInWithFee = (wethIn * FEE_NUMERATOR) / FEE_DENOMINATOR;

         daiOut = (daiBalance * wethInWithFee) / (wethBalance + wethInWithFee);

        require(daiOut >= minDaiOut, "Slippage too high");
        require(daiOut <= daiBalance, "Dex does not have enought dai");

        // Update balances
        wethBalance += wethIn;
        daiBalance -= daiOut;


        weth.transferFrom(msg.sender, address(this), wethIn);
        dai.transfer(msg.sender, daiOut);

        return daiOut;
    }


    // Aliases
    function buyDAI(uint256 wethIn, uint256 minDaiOut) external returns (uint256) {
        return sellWETH(wethIn, minDaiOut);
    }

    function sellDAI(uint256 daiIn, uint256  minWethOut) external returns (uint256) {
        return buyWETH(daiIn, minWethOut);
    }


    // how much WETH for 1 DAI scaled by 1e18
    function getPrice() external view returns (uint256) {
        require(daiBalance > 0, "No liquidity");
        return (wethBalance * 1e18) / daiBalance;
    }


    // Gets the dexs dai balance
    function getDAIBalance() external view returns (uint256) {
        return daiBalance;
    }

    // Gets the dexs WETH balance
    function getWETHBalance() external view returns (uint256) {
        return wethBalance;
    }


}
