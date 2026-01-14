// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

contract Dex {

    address payable public owner;

    address private immutable daiAddress = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address private immutable wethAddress = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;


    IERC20 private dai; // worth around 1 USD
    IERC20 private weth; // worth 1 ETH


    // how many WETH you get for 1 DAI (scaled by 1e18)
    uint256 public price;

    //Balances of the tokens
    mapping(address => uint256) public daiBalances;
    mapping(address => uint256) public wethBalances;


    constructor(uint256 starting_price) {
        require(starting_price > 0, "Price must be > 0");

        owner = payable(msg.sender);
        dai = IERC20(daiAddress);
        weth = IERC20(wethAddress);
        price = starting_price;
    }

    //Buy WETH using DAI
    function buyWETH(uint256 daiAmount) public {
        require(daiAmount > 0, "You cant buy 0 WETH");

        uint256 wethAmount = (daiAmount * price) / 1e18;

        require(
            weth.balanceOf(address(this)) >= wethAmount,
            "The DEX does not have this much WETH in its balance"
        );

        dai.transferFrom(msg.sender, address(this), daiAmount);
        weth.transfer(msg.sender, wethAmount);
    }

    // Sell WETH for DAI
    function sellWETH(uint256 wethAmount) public {
        require(wethAmount > 0, "You cant sell 0 WETH");

        uint256 daiAmount = (wethAmount * 1e18) / price;

        require(
            dai.balanceOf(address(this)) >= daiAmount,
            "The DEX doesnt have enough WETH in its balance"
        );

        weth.transferFrom(msg.sender, address(this), wethAmount);
        dai.transfer(msg.sender, daiAmount);
    }


    function buyDAI(uint256 wethAmount) external {
        sellWETH(wethAmount);
    }

    function sellDAI(uint256 daiAmount) external {
        buyWETH(daiAmount);
    }

    // Change the exchange rate (Simulate the market)
    function setPrice(uint256 newPrice) external {
        require(newPrice > 0, "Invalid price");
        price = newPrice;
    }

    // Get the exchange rate
    function getPrice() external view returns (uint256 ){
        return price;
    }

    // Gets the dexs dai balance
    function getDAIBalance() external view returns (uint256) {
        return dai.balanceOf(address(this));
    }

    // Gets the dexs WETH balance
    function getWETHBalance() external view returns (uint256) {
        return weth.balanceOf(address(this));
    }


}
