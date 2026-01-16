// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

interface IDex {
    function buyWETH(uint256 daiAmount) external;

    function sellWETH(uint256 wethAmount) external;

    function buyDAI(uint256 wethAmount) external;

    function sellDAI(uint256 daiAmount) external;

    function getPrice() external view returns (uint256);

    function getDAIBalance() external view returns (uint256);

    function getWETHBalance() external view returns (uint256);
}


contract FlashLoan is FlashLoanSimpleReceiverBase {

    address private immutable daiAddress = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address private immutable wethAddress = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address payable owner;
    IDex private dexA;
    IDex private dexB;
    IERC20 private dai;
    IERC20 private weth;


    // Outro constructor pra nao da erro nos testes
    constructor(address _addressProvider, address dex1Address, address dex2Address)
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider))
    {
        owner = payable(msg.sender);
        dexA = IDex(dex1Address);
        dexB = IDex(dex2Address);
        dai = IERC20(daiAddress);
        weth = IERC20(wethAddress);
    }

    /**
        This function is called after your contract has received the flash loaned amount
     */
    //TODO implement dynamic ExecuteOperation | MAKE AN ACTUAL FLASHLOAN, CURRENTLY SENDING MONEY TO CONTRACT TO SIMULATE LOAN
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        //
        // This contract now has the funds requested.
        // Your logic goes here.
        //

        require(asset == address(dai), "Only DAI flashloan supported");
        uint256 daiAmount = amount;
        dai.approve(address(dexA), daiAmount);
        dai.approve(address(dexB), daiAmount);


//        uint256 userDAIAmount = getBalance(daiAddress);
//        uint256 userWETHAmount = getBalance(wethAddress);

        // Amount of WETH per DAI
        uint256 dexAPrice = dexA.getPrice();
        uint256 dexBPrice = dexB.getPrice();

        uint256 wethReceived;


        if (dexAPrice > dexBPrice) {
            // WETH is cheaper on DEXA, buy it from DEXA and sell it to DEXB

            dexA.buyWETH(daiAmount);
            wethReceived = (daiAmount * dexAPrice) / 1e18;

            weth.approve(address(dexB), wethReceived);

            // Sell WETH for DAI on Dex B
            dexB.sellWETH(wethReceived);
        }else {
            // WETH is cheaper on DEXB, buy it from DEXB and sell it to DEXA
            dexB.buyWETH(daiAmount);
            wethReceived = (daiAmount * dexBPrice) / 1e18;

            weth.approve(address(dexA), wethReceived);

            dexA.sellWETH(wethReceived);
    }
        uint256 newDAIBalance = dai.balanceOf(address(this));

        // Ensure it was profitable
        uint256 totalDebt = daiAmount + premium;
        require(newDAIBalance >= totalDebt, "Arbitrage not profitable");

        IERC20(asset).approve(address(POOL), totalDebt);

        return true;
    }

    function requestFlashLoan(address _token, uint256 _amount) public {
        address receiverAddress = address(this);
        address asset = _token;
        uint256 amount = _amount;
        bytes memory params = "";
        uint16 referralCode = 0;

        POOL.flashLoanSimple(
            receiverAddress,
            asset,
            amount,
            params,
            referralCode
        );
    }

    function getBalance(address _tokenAddress) public view returns (uint256) {
        return IERC20(_tokenAddress).balanceOf(address(this));
    }

    function withdraw(address _tokenAddress) external onlyOwner {
        IERC20 token = IERC20(_tokenAddress);
        token.transfer(msg.sender, token.balanceOf(address(this)));
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