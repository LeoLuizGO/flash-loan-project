import { useState } from 'react';
import { ethers } from 'ethers';
import { DAI_ADDRESS, WETH_ADDRESS, SLIPPAGE_PRESETS } from '../utils/constants';
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
  const [slippage, setSlippage] = useState(100); // 1% default (100 bps)
  const [customSlippage, setCustomSlippage] = useState('');
  const [selectedDex, setSelectedDex] = useState<'A' | 'B'>('A');
  const [isSwapping, setIsSwapping] = useState(false);
  const [estimatedOutput, setEstimatedOutput] = useState('0');

  const toToken = fromToken === 'DAI' ? 'WETH' : 'DAI';

  const handleSlippagePreset = (value: number) => {
    setSlippage(value);
    setCustomSlippage('');
  };

  const handleCustomSlippage = (value: string) => {
    setCustomSlippage(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
      setSlippage(Math.round(parsed * 100)); // Convert % to bps
    }
  };

  const calculateEstimatedOutput = (inputAmount?: string) => {
    const amountToUse = inputAmount !== undefined ? inputAmount : amount;
    
    if (!ammInfo || !amountToUse || parseFloat(amountToUse) <= 0) {
      setEstimatedOutput('0');
      return;
    }

    const dex = selectedDex === 'A' ? ammInfo.dexA : ammInfo.dexB;
    const amountIn = parseFloat(amountToUse);

    console.log('=== Calculate Output Debug ===');
    console.log('Amount in:', amountIn, fromToken);
    console.log('Selected DEX:', selectedDex);

    try {
      if (fromToken === 'DAI') {
        // DAI -> WETH
        const daiReserve = Number(ethers.formatUnits(dex.daiBalance, 18));
        const wethReserve = Number(ethers.formatUnits(dex.wethBalance, 18));
        console.log('DAI Reserve:', daiReserve);
        console.log('WETH Reserve:', wethReserve);
        
        const amountInWithFee = amountIn * 0.997; // 0.3% fee
        const output = (wethReserve * amountInWithFee) / (daiReserve + amountInWithFee);
        console.log('Calculated output:', output.toFixed(6), 'WETH');
        setEstimatedOutput(output.toFixed(6));
      } else {
        // WETH -> DAI
        const daiReserve = Number(ethers.formatUnits(dex.daiBalance, 18));
        const wethReserve = Number(ethers.formatUnits(dex.wethBalance, 18));
        console.log('DAI Reserve:', daiReserve);
        console.log('WETH Reserve:', wethReserve);
        
        const amountInWithFee = amountIn * 0.997; // 0.3% fee
        const output = (daiReserve * amountInWithFee) / (wethReserve + amountInWithFee);
        console.log('Calculated output:', output.toFixed(2), 'DAI');
        setEstimatedOutput(output.toFixed(2));
      }
    } catch (error) {
      console.error('Error calculating output:', error);
      setEstimatedOutput('0');
    }
    console.log('=============================');
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    calculateEstimatedOutput(value); // Pass value directly instead of waiting for state update
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
      const slippageFraction = slippage / 10000; // Convert bps to fraction
      const estimatedOutNum = parseFloat(estimatedOutput);
      const minAmountOut = ethers.parseUnits(
        (estimatedOutNum * (1 - slippageFraction)).toFixed(18),
        18
      );

      console.log('=== Swap Debug Info ===');
      console.log('Amount in:', amount, fromToken);
      console.log('Estimated output:', estimatedOutput, toToken);
      console.log('Slippage:', slippage, 'bps =', (slippage / 100).toFixed(2), '%');
      console.log('Slippage fraction:', slippageFraction);
      console.log('Min amount out:', ethers.formatUnits(minAmountOut, 18), toToken);
      console.log('====================');

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
    // getPrice() returns WETH per 1 DAI (scaled by 1e18)
    const wethPerDai = Number(ethers.formatUnits(dex.price, 18));
    const daiPerWeth = 1 / wethPerDai;
    
    if (fromToken === 'DAI') {
      return `1 DAI ≈ ${wethPerDai.toFixed(6)} WETH`;
    } else {
      return `1 WETH ≈ ${daiPerWeth.toFixed(2)} DAI`;
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
                setTimeout(() => calculateEstimatedOutput(), 50);
              }}
              disabled={isSwapping}
            >
              DEX A
              {ammInfo && (
                <span className="dex-price">
                  1 WETH = {(1 / Number(ethers.formatUnits(ammInfo.dexA.price, 18))).toFixed(2)} DAI
                </span>
              )}
            </button>
            <button
              className={`dex-select-button ${selectedDex === 'B' ? 'active' : ''}`}
              onClick={() => {
                setSelectedDex('B');
                setTimeout(() => calculateEstimatedOutput(), 50);
              }}
              disabled={isSwapping}
            >
              DEX B
              {ammInfo && (
                <span className="dex-price">
                  1 WETH = {(1 / Number(ethers.formatUnits(ammInfo.dexB.price, 18))).toFixed(2)} DAI
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
          <label>Max Slippage</label>
          <div className="slippage-presets">
            {SLIPPAGE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`slippage-preset ${slippage === preset.value && !customSlippage ? 'active' : ''}`}
                onClick={() => handleSlippagePreset(preset.value)}
                disabled={isSwapping}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            className="slippage-input"
            value={customSlippage}
            onChange={(e) => handleCustomSlippage(e.target.value)}
            placeholder="Custom slippage %"
            min="0.1"
            max="50"
            step="0.1"
            style={{ marginTop: '0.5rem' }}
            disabled={isSwapping}
          />
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Current: {(slippage / 100).toFixed(2)}% ({slippage} bps)
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
          0.3% fee applies to all swaps (Uniswap model)
        </div>
      </div>
    </div>
  );
}
