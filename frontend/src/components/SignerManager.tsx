import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface SignerManagerProps {
  flashLoanContract: ethers.Contract | null;
  currentAccount: string;
}

export function SignerManager({ flashLoanContract, currentAccount }: SignerManagerProps) {
  const [isOwner, setIsOwner] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [newSignerAddress, setNewSignerAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkStatus();
  }, [flashLoanContract, currentAccount]);

  const checkStatus = async () => {
    if (!flashLoanContract || !currentAccount) return;

    try {
      const owner = await flashLoanContract.owner();
      const authorized = await flashLoanContract.authorizedSigners(currentAccount);
      
      setIsOwner(owner.toLowerCase() === currentAccount.toLowerCase());
      setIsAuthorized(authorized);
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const handleAddSigner = async () => {
    if (!flashLoanContract || !newSignerAddress) return;

    // Validate address
    if (!ethers.isAddress(newSignerAddress)) {
      setMessage('Invalid Ethereum address');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const tx = await flashLoanContract.addSigner(newSignerAddress);
      setMessage('Transaction pending...');
      
      await tx.wait();
      
      setMessage(`Successfully added ${newSignerAddress.slice(0, 6)}...${newSignerAddress.slice(-4)} as authorized signer!`);
      setNewSignerAddress('');
      
      // Refresh status if adding self
      if (newSignerAddress.toLowerCase() === currentAccount.toLowerCase()) {
        await checkStatus();
      }
    } catch (error: any) {
      console.error('Error adding signer:', error);
      setMessage(`Error: ${error.reason || error.message || 'Transaction failed'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSelf = async () => {
    if (!flashLoanContract || !currentAccount) return;

    setIsLoading(true);
    setMessage('');

    try {
      const tx = await flashLoanContract.addSigner(currentAccount);
      setMessage('Transaction pending...');
      
      await tx.wait();
      
      setMessage('Successfully authorized your account!');
      await checkStatus();
    } catch (error: any) {
      console.error('Error adding self:', error);
      setMessage(`Error: ${error.reason || error.message || 'Transaction failed'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signer-manager">
      <div className="status-badges">
        {isAuthorized && (
          <span className="badge badge-success">✓ Authorized Signer</span>
        )}
        {!isAuthorized && (
          <span className="badge badge-warning">⚠ Not Authorized</span>
        )}
        {isOwner && (
          <span className="badge badge-owner"> Contract Owner</span>
        )}
      </div>

      {!isAuthorized && !isOwner && (
        <div className="auth-warning">
          <p>Your account is not authorized to execute flash loans.</p>
          <p>Ask the contract owner to authorize your address.</p>
        </div>
      )}

      {isOwner && (
        <div className="owner-controls">
          <h3>Manage Authorized Signers</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Add Ethereum addresses that can execute flash loans
          </p>

          {!isAuthorized && (
            <button
              onClick={handleAddSelf}
              disabled={isLoading}
              className="add-self-button"
              style={{ marginBottom: '1rem' }}
            >
              {isLoading ? 'Processing...' : '✓ Authorize My Account'}
            </button>
          )}

          <div className="add-signer-form">
            <input
              type="text"
              placeholder="0x... (Ethereum address)"
              value={newSignerAddress}
              onChange={(e) => setNewSignerAddress(e.target.value)}
              disabled={isLoading}
              style={{ flex: 1 }}
            />
            <button
              onClick={handleAddSigner}
              disabled={isLoading || !newSignerAddress}
              className="add-button"
            >
              {isLoading ? 'Adding...' : 'Add Signer'}
            </button>
          </div>

          {message && (
            <p className="signer-message" style={{ marginTop: '0.5rem' }}>
              {message}
            </p>
          )}
        </div>
      )}

      <style>{`
        .signer-manager {
          background: var(--card-bg);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border: 1px solid var(--border-color);
        }

        .status-badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .badge {
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .badge-success {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .badge-warning {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }

        .badge-owner {
          background: rgba(139, 92, 246, 0.15);
          color: #8b5cf6;
          border: 1px solid rgba(139, 92, 246, 0.3);
        }

        .auth-warning {
          padding: 1rem;
          background: rgba(251, 191, 36, 0.1);
          border-left: 3px solid #fbbf24;
          border-radius: 6px;
          margin-top: 1rem;
        }

        .auth-warning p {
          margin: 0.5rem 0;
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .owner-controls h3 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
        }

        .add-signer-form {
          display: flex;
          gap: 0.75rem;
        }

        .add-signer-form input {
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--input-bg);
          color: var(--text-primary);
          font-size: 0.95rem;
        }

        .add-signer-form input:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        .add-button, .add-self-button {
          padding: 0.75rem 1.25rem;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .add-self-button {
          width: 100%;
          background: var(--success-color);
        }

        .add-button:hover:not(:disabled), .add-self-button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .add-button:disabled, .add-self-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .signer-message {
          font-size: 0.9rem;
          padding: 0.75rem;
          border-radius: 6px;
          background: var(--bg-secondary);
        }
      `}</style>
    </div>
  );
}
