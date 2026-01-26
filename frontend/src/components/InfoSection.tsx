import React from 'react';

export const InfoSection: React.FC = () => {
  return (
    <div className="info-section card">
      <h3>How It Works</h3>
      <ul>
        <li>
          <strong>Flash Loan:</strong> Borrow assets without collateral - must repay within the same transaction. Powered by Aave V3 protocol.
        </li>
        <li>
          <strong>AMM Arbitrage:</strong> Exploit price differences between two DEXs using the constant product formula (x * y = k).
        </li>
        <li>
          <strong>Cryptographic Signature:</strong> ECDSA digital signature (EIP-191) authenticates and authorizes your flash loan requests.
        </li>
        <li>
          <strong>Replay Protection:</strong> Each signature includes a unique nonce that can only be used once, preventing replay attacks.
        </li>
        <li>
          <strong>Slippage Protection:</strong> Set maximum acceptable price impact to protect against front-running and sandwich attacks.
        </li>
      </ul>

      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '0.75rem', color: 'var(--primary-light)' }}>Arbitrage Strategy</h4>
        <div style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
          <p><strong>For DAI Flash Loans:</strong></p>
          <p style={{ color: 'var(--text-secondary)', marginLeft: '1rem' }}>
            1. Borrow DAI from Aave<br />
            2. Buy WETH where price is higher (cheaper WETH)<br />
            3. Sell WETH where price is lower (expensive WETH)<br />
            4. Repay DAI + 0.05% fee to Aave<br />
            5. Keep profit in contract
          </p>

          <p style={{ marginTop: '1rem' }}><strong>For WETH Flash Loans:</strong></p>
          <p style={{ color: 'var(--text-secondary)', marginLeft: '1rem' }}>
            1. Borrow WETH from Aave<br />
            2. Sell WETH where price is lower (more DAI per WETH)<br />
            3. Buy WETH where price is higher (less DAI per WETH)<br />
            4. Repay WETH + 0.05% fee to Aave<br />
            5. Keep profit in contract
          </p>
        </div>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <strong>Important:</strong> Arbitrage requires &gt;0.6% price difference between DEXs to cover the 2x 0.3% AMM swap fees.
        The transaction will revert if not profitable.
      </div>
    </div>
  );
};

export default InfoSection;
