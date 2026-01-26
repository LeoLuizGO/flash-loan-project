import React, { useMemo } from 'react';
import { ethers } from 'ethers';
import { AMMInfo } from '../types';
import { DAI_ADDRESS, AAVE_FLASH_LOAN_FEE_BPS } from '../utils/constants';
import { formatTokenAmount, formatPercentage } from '../utils/formatters';

interface ProfitCalculatorProps {
  ammInfo: AMMInfo | null;
  selectedToken: string;
  amount: string;
  slippageBps: number;
}

export const ProfitCalculator: React.FC<ProfitCalculatorProps> = ({
  ammInfo,
  selectedToken,
  amount,
  slippageBps,
}) => {
  const calculation = useMemo(() => {
    if (!ammInfo || !amount || parseFloat(amount) <= 0) {
      return null;
    }

    try {
      const amountWei = ethers.parseEther(amount);
      const amountNum = Number(amountWei);

      const { dexA, dexB } = ammInfo;
      const isDAI = selectedToken === DAI_ADDRESS;

      // Flash loan fee (0.05%)
      const flashLoanFee = (amountNum * AAVE_FLASH_LOAN_FEE_BPS) / 10000;

      // Determine which DEX to buy from and which to sell
      let buyDex: typeof dexA;
      let sellDex: typeof dexB;

      if (isDAI) {
        // DAI -> WETH -> DAI
        // Higher price = cheaper WETH (more WETH per DAI) = buy here
        if (Number(dexA.price) > Number(dexB.price)) {
          buyDex = dexA;
          sellDex = dexB;
        } else {
          buyDex = dexB;
          sellDex = dexA;
        }

        // Calculate swap 1: DAI -> WETH (at buyDex)
        const daiInWithFee = (amountNum * 997) / 1000;
        const daiReserveBuy = Number(buyDex.daiBalance);
        const wethReserveBuy = Number(buyDex.wethBalance);
        const wethOut = (wethReserveBuy * daiInWithFee) / (daiReserveBuy + daiInWithFee);

        // Calculate swap 2: WETH -> DAI (at sellDex)
        const wethInWithFee = (wethOut * 997) / 1000;
        const daiReserveSell = Number(sellDex.daiBalance);
        const wethReserveSell = Number(sellDex.wethBalance);
        const daiOut = (daiReserveSell * wethInWithFee) / (wethReserveSell + wethInWithFee);

        // Total required to repay
        const totalDebt = amountNum + flashLoanFee;

        // Gross profit before slippage consideration
        const grossProfit = daiOut - totalDebt;

        // Slippage buffer
        const slippageAmount = (Math.abs(grossProfit) * slippageBps) / 10000;

        // Net profit
        const netProfit = grossProfit - slippageAmount;

        const profitPercentage = (netProfit / amountNum) * 100;

        return {
          loanAmount: amountNum,
          flashLoanFee,
          totalDebt,
          step1Output: wethOut,
          step2Output: daiOut,
          grossProfit,
          slippageAmount,
          netProfit,
          profitPercentage,
          isProfitable: netProfit > 0,
          buyDex: buyDex.name,
          sellDex: sellDex.name,
          tokenIn: 'DAI',
          tokenMid: 'WETH',
          tokenOut: 'DAI',
        };
      } else {
        // WETH -> DAI -> WETH
        // Lower price = cheaper DAI (less WETH per DAI = more DAI per WETH) = sell WETH here
        if (Number(dexA.price) < Number(dexB.price)) {
          sellDex = dexA;
          buyDex = dexB;
        } else {
          sellDex = dexB;
          buyDex = dexA;
        }

        // Calculate swap 1: WETH -> DAI (at sellDex)
        const wethInWithFee = (amountNum * 997) / 1000;
        const daiReserveSell = Number(sellDex.daiBalance);
        const wethReserveSell = Number(sellDex.wethBalance);
        const daiOut = (daiReserveSell * wethInWithFee) / (wethReserveSell + wethInWithFee);

        // Calculate swap 2: DAI -> WETH (at buyDex)
        const daiInWithFee = (daiOut * 997) / 1000;
        const daiReserveBuy = Number(buyDex.daiBalance);
        const wethReserveBuy = Number(buyDex.wethBalance);
        const wethOut = (wethReserveBuy * daiInWithFee) / (daiReserveBuy + daiInWithFee);

        // Total required to repay
        const totalDebt = amountNum + flashLoanFee;

        // Gross profit
        const grossProfit = wethOut - totalDebt;

        // Slippage buffer
        const slippageAmount = (Math.abs(grossProfit) * slippageBps) / 10000;

        // Net profit
        const netProfit = grossProfit - slippageAmount;

        const profitPercentage = (netProfit / amountNum) * 100;

        return {
          loanAmount: amountNum,
          flashLoanFee,
          totalDebt,
          step1Output: daiOut,
          step2Output: wethOut,
          grossProfit,
          slippageAmount,
          netProfit,
          profitPercentage,
          isProfitable: netProfit > 0,
          buyDex: buyDex.name,
          sellDex: sellDex.name,
          tokenIn: 'WETH',
          tokenMid: 'DAI',
          tokenOut: 'WETH',
        };
      }
    } catch {
      return null;
    }
  }, [ammInfo, selectedToken, amount, slippageBps]);

  if (!calculation) {
    return (
      <div className="profit-calculator card">
        <h3>Profit Estimation</h3>
        <div className="empty-state">
          <p style={{ color: 'var(--text-muted)' }}>
            Enter a loan amount to see profit estimation
          </p>
        </div>
      </div>
    );
  }

  const formatWei = (value: number) => {
    return formatTokenAmount(BigInt(Math.floor(value)));
  };

  return (
    <div className="profit-calculator card">
      <h3>Profit Estimation</h3>

      <div className="profit-breakdown">
        <div className="profit-row">
          <span className="profit-label">Flash Loan Amount</span>
          <span className="profit-value">{formatWei(calculation.loanAmount)} {calculation.tokenIn}</span>
        </div>

        <div className="profit-row">
          <span className="profit-label">Aave Flash Loan Fee (0.05%)</span>
          <span className="profit-value">{formatWei(calculation.flashLoanFee)} {calculation.tokenIn}</span>
        </div>

        <div className="profit-row">
          <span className="profit-label">
            Step 1: {calculation.tokenIn} &rarr; {calculation.tokenMid} ({calculation.buyDex})
          </span>
          <span className="profit-value">{formatWei(calculation.step1Output)} {calculation.tokenMid}</span>
        </div>

        <div className="profit-row">
          <span className="profit-label">
            Step 2: {calculation.tokenMid} &rarr; {calculation.tokenOut} ({calculation.sellDex})
          </span>
          <span className="profit-value">{formatWei(calculation.step2Output)} {calculation.tokenOut}</span>
        </div>

        <div className="profit-row">
          <span className="profit-label">Total Debt (Loan + Fee)</span>
          <span className="profit-value">{formatWei(calculation.totalDebt)} {calculation.tokenOut}</span>
        </div>

        <div className="profit-row warning">
          <span className="profit-label">Slippage Buffer ({(slippageBps / 100).toFixed(2)}%)</span>
          <span className="profit-value">-{formatWei(calculation.slippageAmount)} {calculation.tokenOut}</span>
        </div>

        <div className={`profit-row ${calculation.isProfitable ? 'highlight' : 'negative'}`}>
          <span className="profit-label">
            <strong>Estimated Net Profit</strong>
          </span>
          <span className={`profit-value ${calculation.netProfit >= 0 ? 'positive' : 'negative'}`}>
            {calculation.netProfit >= 0 ? '+' : ''}{formatWei(calculation.netProfit)} {calculation.tokenOut}
            <br />
            <span style={{ fontSize: '0.75rem' }}>
              ({formatPercentage(calculation.profitPercentage)})
            </span>
          </span>
        </div>
      </div>

      {!calculation.isProfitable && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: 'var(--error)'
        }}>
          This arbitrage is not profitable with current prices. The transaction will revert.
        </div>
      )}
    </div>
  );
};

export default ProfitCalculator;
