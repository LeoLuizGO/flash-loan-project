import React from 'react';
import { Transaction } from '../types';
import { formatHash, formatTimestamp } from '../utils/formatters';
import { TOKENS } from '../utils/constants';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
}) => {
  if (transactions.length === 0) {
    return (
      <div className="transaction-history card">
        <h3>Transaction History</h3>
        <div className="empty-state">
          <p>No transactions yet</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Execute a flash loan to see your transaction history
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-history card">
      <h3>Transaction History</h3>
      <div className="tx-list">
        {transactions.map((tx, index) => (
          <TransactionItem key={tx.hash || index} transaction={tx} />
        ))}
      </div>
    </div>
  );
};

interface TransactionItemProps {
  transaction: Transaction;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const tokenInfo = TOKENS[transaction.token as keyof typeof TOKENS] || {
    symbol: 'TOKEN',
    name: 'Unknown Token',
  };

  const statusIcons = {
    pending: '&#x23F3;', // Hourglass
    success: '&#x2705;', // Check mark
    failed: '&#x274C;',  // X mark
  };

  const handleTxClick = () => {
    if (transaction.hash) {
      // For localhost, just copy to clipboard
      navigator.clipboard.writeText(transaction.hash);
      alert(`Transaction hash copied: ${transaction.hash}`);
    }
  };

  return (
    <div className="tx-item" onClick={handleTxClick} style={{ cursor: 'pointer' }}>
      <div className={`tx-icon ${transaction.status}`}>
        <span dangerouslySetInnerHTML={{ __html: statusIcons[transaction.status] }} />
      </div>

      <div className="tx-details">
        <div className="tx-type">
          {transaction.type === 'flash_loan' && 'Flash Loan Arbitrage'}
          {transaction.type === 'swap' && 'Token Swap'}
          {transaction.type === 'withdraw' && 'Withdraw Profits'}
        </div>
        <div className="tx-hash">
          {transaction.hash ? formatHash(transaction.hash) : 'Pending...'}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {formatTimestamp(transaction.timestamp)}
        </div>
      </div>

      <div className="tx-amount">
        <div className="tx-token-amount">
          {transaction.amount} {tokenInfo.symbol}
        </div>
      </div>

      {transaction.profit && (
        <div className={`tx-profit ${parseFloat(transaction.profit) >= 0 ? 'positive' : 'negative'}`}>
          {parseFloat(transaction.profit) >= 0 ? '+' : ''}
          {transaction.profit} {tokenInfo.symbol}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
