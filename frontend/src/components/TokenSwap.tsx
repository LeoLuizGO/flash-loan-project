import { useState } from 'react';
import { ethers } from 'ethers';
import { DAI_ADDRESS, WETH_ADDRESS } from '../utils/constants';
import { DexInfo } from '../types';

interface TokenSwapProps {
  dexAContract: ethers.Contract | null;
  dexBContract: ethers.Contract | null;
  ammInfo: { dexA: DexInfo; dexB: DexInfo } | null;
  onSwapSuccess?: () => void;
}

export function TokenSwap({ dexAContract, dexBContract, ammInfo, onSwapSuccess }: TokenSwapProps) {
  const [fromToken, setFromToken] = useState<'DAI' | 'WETH'>('DAI');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(1); // 1%
  const [selectedDex, setSelectedDex] = useState<'A' | 'B'>('A');
  const [isSwapping, setIsSwapping] = useState(false);
  const [estimatedOutput, setEstimatedOutput] = useState('0');

  const toToken = fromToken === 'DAI' ? 'WETH' : 'DAI';

  const calculateEstimatedOutput = () => {
    if (!ammInfo || !amount || parseFloat(amount) <= 0) {
      setEstimatedOutput('0');
      return;
    }

    const dex = selectedDex === 'A' ? ammInfo.dexA : ammInfo.dexB;
    const amountIn = parseFloat(amount);

    try {
      if (fromToken === 'DAI') {
        // DAI -> WETH
        const daiReserve = Number(ethers.formatUnits(dex.daiBalance, 18));
        const wethReserve = Number(ethers.formatUnits(dex.wethBalance, 18));
        const amountInWithFee = amountIn * 0.997; // 0.3% fee
        const output = (wethReserve * amountInWithFee) / (daiReserve + amountInWithFee);
        setEstimatedOutput(output.toFixed(6));
      } else {
        // WETH -> DAI
        const daiReserve = Number(ethers.formatUnits(dex.daiBalance, 18));
        const wethReserve = Number(ethers.formatUnits(dex.wethBalance, 18));
        const amountInWithFee = amountIn * 0.997; // 0.3% fee
        const output = (daiReserve * amountInWithFee) / (wethReserve + amountInWithFee);
        setEstimatedOutput(output.toFixed(2));
      }
    } catch (error) {
      console.error('Error calculating output:', error);
      setEstimatedOutput('0');
    }
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setTimeout(() => calculateEstimatedOutput(), 100);
  };

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const dexContract = selectedDex === 'A' ? dexAContract : dexBContract;
    if (!dexContract) {
      alert('DEX contract not initialized');
      return;
    }

    setIsSwapping(true);
    try {
      const amountIn = ethers.parseUnits(amount, 18);
      const minAmountOut = ethers.parseUnits(
        (parseFloat(estimatedOutput) * (1 - slippage / 100)).toString(),
        18
      );

      let tx;
      const fromTokenAddress = fromToken === 'DAI' ? DAI_ADDRESS : WETH_ADDRESS;
      
      // Approve tokens first
      const tokenContract = new ethers.Contract(
        fromTokenAddress,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        await dexContract.runner
      );

      console.log(`Approving ${amount} ${fromToken} for DEX ${selectedDex}...`);
      const approveTx = await tokenContract.approve(await dexContract.getAddress(), amountIn);
      await approveTx.wait();

      console.log(`Swapping ${amount} ${fromToken} for ${toToken} on DEX ${selectedDex}...`);
      
      if (fromToken === 'DAI') {
        // Buy WETH with DAI
        tx = await dexContract.buyWETH(amountIn, minAmountOut);
      } else {
        // Sell WETH for DAI
        tx = await dexContract.sellWETH(amountIn, minAmountOut);
      }

      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      
      alert(`✅ Successfully swapped ${amount} ${fromToken} for ~${estimatedOutput} ${toToken}!`);
      
      setAmount('');
      setEstimatedOutput('0');
      
      if (onSwapSuccess) {
        onSwapSuccess();
      }
    } catch (err: any) {
      console.error('Error swapping:', err);
      
      let errorMsg = 'Unknown error';
      if (err.message?.includes('Slippage too high')) {
        errorMsg = 'Slippage too high - try increasing slippage tolerance';
      } else if (err.message?.includes('insufficient allowance')) {
        errorMsg = 'Token approval failed';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      alert(`❌ Swap failed: ${errorMsg}`);
    } finally {
      setIsSwapping(false);
    }
  };

  const switchTokens = () => {
    setFromToken(fromToken === 'DAI' ? 'WETH' : 'DAI');
    setAmount('');
    setEstimatedOutput('0');
  };

  const getExchangeRate = () => {
    if (!ammInfo) return '0';
    const dex = selectedDex === 'A' ? ammInfo.dexA : ammInfo.dexB;
    const price = Number(ethers.formatUnits(dex.price, 18));
    
    if (fromToken === 'DAI') {
      return `1 DAI = ${price.toFixed(6)} WETH`;
    } else {
      return `1 WETH = ${(1 / price).toFixed(2)} DAI`;
    }
  };

  return (
    <div className="token-swap">
      <div className="section-header">
        <h2>Token Swap</h2>
        <p className="section-description">
          Swap tokens directly on the DEX AMMs
        </p>
      </div>

      <div className="swap-content">
        {/* DEX Selection */}
        <div className="dex-selection">
          <label>Select DEX:</label>
          <div className="dex-buttons">
            <button
              className={`dex-select-button ${selectedDex === 'A' ? 'active' : ''}`}
              onClick={() => {
                setSelectedDex('A');
                setTimeout(() => calculateEstimatedOutput(), 100);
              }}
              disabled={isSwapping}
            >
              DEX A
              {ammInfo && (
                <span className="dex-price">
                  {Number(ethers.formatUnits(ammInfo.dexA.price, 18)).toFixed(6)} WETH/DAI
                </span>
              )}
            </button>
            <button
              className={`dex-select-button ${selectedDex === 'B' ? 'active' : ''}`}
              onClick={() => {
                setSelectedDex('B');
                setTimeout(() => calculateEstimatedOutput(), 100);
              }}
              disabled={isSwapping}
            >
              DEX B
              {ammInfo && (
                <span className="dex-price">
                  {Number(ethers.formatUnits(ammInfo.dexB.price, 18)).toFixed(6)} WETH/DAI
                </span>
              )}
            </button>
          </div>
        </div>

        {/* From Token */}
        <div className="swap-input-group">
          <label>From</label>
          <div className="swap-input-container">
            <input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.0"
              disabled={isSwapping}
              step="0.01"
              min="0"
            />
            <div className="token-badge">{fromToken}</div>
          </div>
        </div>

        {/* Switch Button */}
        <div className="swap-switch">
          <button
            className="switch-button"
            onClick={switchTokens}
            disabled={isSwapping}
            title="Switch tokens"
          >
            ⇅
          </button>
        </div>

        {/* To Token */}
        <div className="swap-input-group">
          <label>To (estimated)</label>
          <div className="swap-input-container">
            <input
              type="text"
              value={estimatedOutput}
              placeholder="0.0"
              disabled
              readOnly
            />
            <div className="token-badge">{toToken}</div>
          </div>
        </div>

        {/* Exchange Rate */}
        {ammInfo && (
          <div className="exchange-rate">
            <span>Exchange Rate:</span>
            <span className="rate-value">{getExchangeRate()}</span>
          </div>
        )}

        {/* Slippage */}
        <div className="slippage-control">
          <label>Slippage Tolerance: {slippage}%</label>
          <div className="slippage-buttons">
            {[0.5, 1, 2, 5].map((value) => (
              <button
                key={value}
                className={`slippage-button ${slippage === value ? 'active' : ''}`}
                onClick={() => setSlippage(value)}
                disabled={isSwapping}
              >
                {value}%
              </button>
            ))}
          </div>
        </div>

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          className="swap-button"
          disabled={isSwapping || !amount || parseFloat(amount) <= 0 || !ammInfo}
        >
          {isSwapping ? (
            <>
              <span className="spinner" />
              Swapping...
            </>
          ) : (
            `Swap ${fromToken} for ${toToken}`
          )}
        </button>

        <div className="swap-info">
          ⓘ 0.3% fee applies to all swaps (Uniswap model)
        </div>
      </div>
    </div>
  );
}
