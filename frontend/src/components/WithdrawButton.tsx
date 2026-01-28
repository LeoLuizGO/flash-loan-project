import { useState } from 'react';
import { ethers } from 'ethers';
import { DAI_ADDRESS, WETH_ADDRESS } from '../utils/constants';

interface WithdrawButtonProps {
  flashLoanContract: ethers.Contract | null;
  onWithdrawSuccess?: () => void;
}

export function WithdrawButton({ flashLoanContract, onWithdrawSuccess }: WithdrawButtonProps) {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [selectedToken, setSelectedToken] = useState(DAI_ADDRESS);
  const [balance, setBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const fetchBalance = async () => {
    if (!flashLoanContract) return;

    setIsLoadingBalance(true);
    try {
      const tokenContract = new ethers.Contract(
        selectedToken,
        ['function balanceOf(address) view returns (uint256)'],
        flashLoanContract.runner
      );

      const contractBalance = await tokenContract.balanceOf(
        await flashLoanContract.getAddress()
      );

      setBalance(ethers.formatUnits(contractBalance, 18));
    } catch (err: any) {
      console.error('Error fetching balance:', err);
      setBalance('0');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleWithdraw = async () => {
    if (!flashLoanContract) {
      alert('Contract not initialized');
      return;
    }

    setIsWithdrawing(true);
    try {
      const tx = await flashLoanContract.withdraw(selectedToken);
      console.log('Withdraw transaction sent:', tx.hash);

      await tx.wait();
      console.log('Withdraw successful!');
      
      const tokenSymbol = selectedToken === DAI_ADDRESS ? 'DAI' : 'WETH';
      alert(`✅ Successfully withdrawn ${balance} ${tokenSymbol}!\n\nCheck your wallet balances above or run:\nnpx hardhat run scripts/check-balances.cjs --network localhost`);
      
      // Refresh balance
      await fetchBalance();
      
      if (onWithdrawSuccess) {
        onWithdrawSuccess();
      }
    } catch (err: any) {
      console.error('Error withdrawing:', err);
      
      let errorMsg = 'Unknown error';
      if (err.message?.includes('Only the contract owner')) {
        errorMsg = 'Only the contract owner can withdraw funds';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      alert(`Withdrawal failed: ${errorMsg}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="withdraw-section">
      <div className="section-header">
        <h2>Withdraw Profits</h2>
        <p className="section-description">
          Withdraw accumulated profits from the contract to your wallet
        </p>
      </div>

      <div className="withdraw-content">
        <div className="token-selector">
          <label htmlFor="withdraw-token">Select Token:</label>
          <select
            id="withdraw-token"
            value={selectedToken}
            onChange={(e) => {
              setSelectedToken(e.target.value);
              setBalance('0');
            }}
            disabled={isWithdrawing}
          >
            <option value={DAI_ADDRESS}>DAI</option>
            <option value={WETH_ADDRESS}>WETH</option>
          </select>
        </div>

        <div className="balance-display">
          <button
            onClick={fetchBalance}
            className="check-balance-button"
            disabled={isLoadingBalance || isWithdrawing}
          >
            {isLoadingBalance ? 'Loading...' : 'Check Balance'}
          </button>
          
          {balance !== '0' && (
            <div className="balance-info">
              <span className="balance-label">Contract Balance:</span>
              <span className="balance-amount">
                {parseFloat(balance).toFixed(6)} {selectedToken === DAI_ADDRESS ? 'DAI' : 'WETH'}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleWithdraw}
          className="withdraw-button"
          disabled={isWithdrawing || !flashLoanContract || balance === '0'}
        >
          {isWithdrawing ? (
            <>
              <span className="spinner" />
              Withdrawing...
            </>
          ) : (
            'Withdraw to Wallet'
          )}
        </button>

        {/* <div className="withdraw-warning">
          Only the contract owner can withdraw funds
        </div> */}

        <div className="withdraw-info">
          <strong>Forked Network Note:</strong> After withdrawal, your tokens will appear in the "Your Wallet Balances" section above. 
          MetaMask cannot display mainnet tokens on localhost networks.
        </div>
      </div>
    </div>
  );
}
