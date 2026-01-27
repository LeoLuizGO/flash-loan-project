import { useState, useCallback } from 'react';
import './App.css';

// Hooks
import { useWallet } from './hooks/useWallet';
import { useContracts } from './hooks/useContracts';
import { useFlashLoan } from './hooks/useFlashLoan';

// Components
import {
  DexInfoPanel,
  FlashLoanForm,
  ProfitCalculator,
  TransactionHistory,
  StatusMessage,
  InfoSection,
  SignerManager,
  WithdrawButton,
  WalletBalances,
  TokenSwap,
} from './components';

// Utils
import { formatAddress } from './utils/formatters';
import { DAI_ADDRESS } from './utils/constants';

function App() {
  // Wallet connection
  const {
    account,
    provider,
    signer,
    isConnected,
    connect,
    disconnect,
    isConnecting,
    error: walletError,
  } = useWallet();

  // Contract instances and AMM info
  const {
    flashLoanContract,
    dexAContract,
    dexBContract,
    ammInfo,
    isLoading: isLoadingAMM,
    error: contractError,
    refreshAMMInfo,
  } = useContracts(signer, provider);

  // Flash loan operations
  const {
    nonce,
    signature,
    isLoading: isLoadingFlashLoan,
    error: flashLoanError,
    transactions,
    generateSignature,
    executeFlashLoan,
    clearError,
    resetData,
  } = useFlashLoan(flashLoanContract, signer, account);

  // Local state for form
  const [selectedToken, setSelectedToken] = useState(DAI_ADDRESS);
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(100);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');

  // Handle signature generation
  const handleGenerateSignature = useCallback(
    async (token: string, amt: string) => {
      setSelectedToken(token);
      setAmount(amt);
      setStatusMessage('Generating signature...');
      setStatusType('info');

      const sig = await generateSignature(token, amt);

      if (sig) {
        setStatusMessage('Signature generated successfully!');
        setStatusType('success');
      } else {
        setStatusMessage('Failed to generate signature');
        setStatusType('error');
      }

      return sig;
    },
    [generateSignature]
  );

  // Handle flash loan execution
  const handleExecuteFlashLoan = useCallback(
    async (token: string, amt: string, slippageBps: number, sig?: string) => {
      setSelectedToken(token);
      setAmount(amt);
      setSlippage(slippageBps);
      setStatusMessage('Executing flash loan...');
      setStatusType('info');

      const success = await executeFlashLoan(token, amt, slippageBps, sig);

      if (success) {
        setStatusMessage('Flash loan executed successfully!');
        setStatusType('success');
      } else {
        setStatusMessage(flashLoanError || 'Flash loan failed');
        setStatusType('error');
      }

      return success;
    },
    [executeFlashLoan, flashLoanError]
  );

  // Clear status message
  const handleClearStatus = useCallback(() => {
    setStatusMessage('');
    clearError();
  }, [clearError]);

  // Handle disconnect with data cleanup
  const handleDisconnect = useCallback(() => {
    resetData();
    setStatusMessage('');
    setAmount('');
    disconnect();
  }, [resetData, disconnect]);

  // Combined error message
  const errorMessage = walletError || contractError || flashLoanError;

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-left">
          <img src="/insa-logo.png" alt="INSA Lyon" className="insa-logo" />
        </div>
        <div className="header-center">
          <h1>Flash Loan AMM</h1>
          <p>Arbitrage System with Cryptographic Authentication</p>
        </div>
        <div className="header-right">
          <div className="token-icons">
            <div className="token-icon dai-icon">DAI</div>
            <div className="token-icon weth-icon">WETH</div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {!isConnected ? (
          <div className="connect-section">
            <h2>Connect Your Wallet</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Connect MetaMask to interact with the Flash Loan contracts
            </p>
            <button
              onClick={connect}
              className="connect-button"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <span className="spinner" />
                  Connecting...
                </>
              ) : (
                'Connect MetaMask'
              )}
            </button>
            {walletError && (
              <p style={{ color: 'var(--error)', marginTop: '1rem' }}>{walletError}</p>
            )}
          </div>
        ) : (
          <div className="flash-loan-interface">
            {/* Account Info */}
            <div className="account-info">
              <div className="account-details">
                <h3>Connected Account</h3>
                <p className="account-address">{formatAddress(account)}</p>
              </div>
              <button onClick={handleDisconnect} className="disconnect-button">
                Disconnect
              </button>
            </div>

            {/* Status Message */}
            {(statusMessage || errorMessage) && (
              <StatusMessage
                message={errorMessage || statusMessage}
                type={errorMessage ? 'error' : statusType}
                onClose={handleClearStatus}
              />
            )}

            {/* Signer Manager */}
            <SignerManager 
              flashLoanContract={flashLoanContract}
              currentAccount={account}
            />


            {/* Wallet Balances */}
            <WalletBalances
              account={account}
              provider={provider}
            />

            {/* DEX Information Panel */}
            <DexInfoPanel
              ammInfo={ammInfo}
              isLoading={isLoadingAMM}
              onRefresh={refreshAMMInfo}
            />

            {/* Flash Loan Form */}
            <FlashLoanForm
              onGenerateSignature={handleGenerateSignature}
              onExecuteFlashLoan={handleExecuteFlashLoan}
              signature={signature}
              nonce={nonce}
              isLoading={isLoadingFlashLoan}
            />

            {/* Profit Calculator */}
            <ProfitCalculator
              ammInfo={ammInfo}
              selectedToken={selectedToken}
              amount={amount}
              slippageBps={slippage}
            />

            {/* Token Swap */}
            <TokenSwap
              dexAContract={dexAContract}
              dexBContract={dexBContract}
              ammInfo={ammInfo}
              onSwapSuccess={refreshAMMInfo}
            />
            
            {/* Withdraw Button */}
            <WithdrawButton
              flashLoanContract={flashLoanContract}
              onWithdrawSuccess={refreshAMMInfo}
            />

            {/* Transaction History */}
            <TransactionHistory transactions={transactions} />

            {/* Info Section */}
            <InfoSection />
          </div>
        )}
      </main>

      <footer className="App-footer">
        <p>Developed for INSA Lyon - Blockchain Course</p>
        <p>Flash Loan with Cryptography - Aave V3 - Ethereum</p>
      </footer>
    </div>
  );
}

export default App;
