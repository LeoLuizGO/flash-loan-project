import React from 'react';
import { AMMInfo } from '../types';
import { formatTokenAmount, formatPrice, formatPercentage } from '../utils/formatters';

interface DexInfoPanelProps {
  ammInfo: AMMInfo | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const DexInfoPanel: React.FC<DexInfoPanelProps> = ({
  ammInfo,
  isLoading,
  onRefresh,
}) => {
  if (!ammInfo) {
    return (
      <div className="card dex-info-panel">
        <div className="section-header">
          <h2>AMM Information</h2>
          <button
            className="refresh-button"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? <span className="spinner-small" /> : <RefreshIcon />}
          </button>
        </div>
        <div className="empty-state">
          <p>Loading DEX information...</p>
        </div>
      </div>
    );
  }

  const { dexA, dexB, priceDifference, isProfitable } = ammInfo;

  return (
    <div className="card dex-info-panel">
      <div className="section-header">
        <h2>AMM Information</h2>
        <button
          className="refresh-button"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh prices"
        >
          {isLoading ? <span className="spinner-small" /> : <RefreshIcon />}
        </button>
      </div>

      <div className="dex-grid">
        <div className="dex-card">
          <div className="dex-header">
            <span className="dex-name">{dexA.name}</span>
            <span className="dex-status">Online</span>
          </div>
          <div className="dex-stats">
            <div className="stat-row">
              <span className="stat-label">Price (WETH/DAI)</span>
              <span className="stat-value">{formatPrice(dexA.price)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">DAI Reserve</span>
              <span className="stat-value">{formatTokenAmount(dexA.daiBalance)} DAI</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">WETH Reserve</span>
              <span className="stat-value">{formatTokenAmount(dexA.wethBalance)} WETH</span>
            </div>
          </div>
        </div>

        <div className="dex-card dex-b">
          <div className="dex-header">
            <span className="dex-name">{dexB.name}</span>
            <span className="dex-status">Online</span>
          </div>
          <div className="dex-stats">
            <div className="stat-row">
              <span className="stat-label">Price (WETH/DAI)</span>
              <span className="stat-value">{formatPrice(dexB.price)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">DAI Reserve</span>
              <span className="stat-value">{formatTokenAmount(dexB.daiBalance)} DAI</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">WETH Reserve</span>
              <span className="stat-value">{formatTokenAmount(dexB.wethBalance)} WETH</span>
            </div>
          </div>
        </div>

        <div className={`price-diff ${isProfitable ? 'profitable' : ''}`}>
          <div className="price-diff-label">Price Difference</div>
          <div className="price-diff-value">
            {formatPercentage(priceDifference)}
            {isProfitable && ' - Arbitrage Opportunity!'}
          </div>
          {!isProfitable && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Need &gt; 0.6% difference for profitable arbitrage (2x 0.3% AMM fees)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RefreshIcon: React.FC = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

export default DexInfoPanel;
