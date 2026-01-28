import React, { useState } from 'react';
import { DAI_ADDRESS, WETH_ADDRESS, SLIPPAGE_PRESETS } from '../utils/constants';

interface FlashLoanFormProps {
  onGenerateSignature: (token: string, amount: string) => Promise<string | null>;
  onExecuteFlashLoan: (token: string, amount: string, slippage: number, signature?: string) => Promise<boolean>;
  signature: string;
  nonce: number;
  isLoading: boolean;
}

export const FlashLoanForm: React.FC<FlashLoanFormProps> = ({
  onGenerateSignature,
  onExecuteFlashLoan,
  signature,
  nonce,
  isLoading,
}) => {
  const [selectedToken, setSelectedToken] = useState(DAI_ADDRESS);
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(100); // 1% default
  const [customSlippage, setCustomSlippage] = useState('');

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

  const handleGenerateSignature = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    await onGenerateSignature(selectedToken, amount);
  };

  const handleExecute = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!signature) {
      alert('Please generate a signature first');
      return;
    }
    await onExecuteFlashLoan(selectedToken, amount, slippage, signature);
  };

  const tokenSymbol = selectedToken === DAI_ADDRESS ? 'DAI' : 'WETH';

  return (
    <div className="loan-form card">
      <h2>Flash Loan Configuration</h2>

      <div className="form-group">
        <label>Token</label>
        <select
          className="token-select"
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value)}
          disabled={isLoading}
        >
          <option value={DAI_ADDRESS}>DAI (Stablecoin)</option>
          <option value={WETH_ADDRESS}>WETH (Wrapped Ether)</option>
        </select>
      </div>

      <div className="form-group">
        <label>Loan Amount ({tokenSymbol})</label>
        <input
          type="number"
          className="amount-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`e.g., 1000 ${tokenSymbol}`}
          min="0"
          step="0.01"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label>Max Slippage</label>
        <div className="slippage-presets">
          {SLIPPAGE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={`slippage-preset ${slippage === preset.value && !customSlippage ? 'active' : ''}`}
              onClick={() => handleSlippagePreset(preset.value)}
              disabled={isLoading}
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
          disabled={isLoading}
        />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Current: {(slippage / 100).toFixed(2)}% ({slippage} bps)
        </div>
      </div>

      <div className="form-group">
        <label>Nonce (Replay Protection)</label>
        <input
          type="number"
          className="nonce-input"
          value={nonce}
          readOnly
          disabled
        />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Auto-incremented for each signature
        </div>
      </div>

      <div className="button-group">
        <button
          type="button"
          className="sign-button"
          onClick={handleGenerateSignature}
          disabled={isLoading || !amount}
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Signing...
            </>
          ) : (
            <>
              <SignIcon />
              Generate Signature
            </>
          )}
        </button>

        <button
          type="button"
          className="execute-button"
          onClick={handleExecute}
          disabled={isLoading || !signature}
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Executing...
            </>
          ) : (
            <>
              <FlashIcon />
              Execute Flash Loan
            </>
          )}
        </button>
      </div>

      {signature && (
        <div className="signature-display">
          <h4>Generated Signature</h4>
          <p className="signature-text">
            {signature.substring(0, 30)}...{signature.substring(signature.length - 30)}
          </p>
        </div>
      )}
    </div>
  );
};

const SignIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

const FlashIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export default FlashLoanForm;
