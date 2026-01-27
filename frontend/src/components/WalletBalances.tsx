import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { DAI_ADDRESS, WETH_ADDRESS } from '../utils/constants';

interface WalletBalancesProps {
  account: string;
  provider: ethers.BrowserProvider | null;
}

export function WalletBalances({ account, provider }: WalletBalancesProps) {
  const [daiBalance, setDaiBalance] = useState<string>('0');
  const [wethBalance, setWethBalance] = useState<string>('0');
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);

  const fetchBalances = async () => {
    if (!provider || !account) return;

    setIsLoading(true);
    try {
      // Get ETH balance
      const ethBal = await provider.getBalance(account);
      setEthBalance(ethers.formatEther(ethBal));

      // Get DAI balance
      const daiContract = new ethers.Contract(
        DAI_ADDRESS,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      const daiBal = await daiContract.balanceOf(account);
      setDaiBalance(ethers.formatUnits(daiBal, 18));

      // Get WETH balance
      const wethContract = new ethers.Contract(
        WETH_ADDRESS,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      const wethBal = await wethContract.balanceOf(account);
      setWethBalance(ethers.formatUnits(wethBal, 18));
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [account, provider]);

  return (
    <div className="wallet-balances">
      <div className="section-header">
        <h2>💰 Your Wallet Balances</h2>
        <button
          onClick={fetchBalances}
          className="refresh-button-small"
          disabled={isLoading}
          title="Refresh balances"
        >
          {isLoading ? '⟳' : '🔄'}
        </button>
      </div>

      <div className="balances-grid">
        <div className="balance-card eth-card">
          <div className="balance-icon">Ξ</div>
          <div className="balance-details">
            <span className="balance-label">ETH</span>
            <span className="balance-value">
              {parseFloat(ethBalance).toFixed(4)}
            </span>
          </div>
        </div>

        <div className="balance-card dai-card">
          <div className="balance-icon dai-icon">DAI</div>
          <div className="balance-details">
            <span className="balance-label">DAI</span>
            <span className="balance-value">
              {parseFloat(daiBalance).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <div className="balance-card weth-card">
          <div className="balance-icon weth-icon">WETH</div>
          <div className="balance-details">
            <span className="balance-label">WETH</span>
            <span className="balance-value">
              {parseFloat(wethBalance).toFixed(6)}
            </span>
          </div>
        </div>
      </div>

      <div className="balance-note">
        ℹ️ <strong>Note:</strong> These balances are read directly from the blockchain. 
        MetaMask may not display them because you're on a forked network.
      </div>
    </div>
  );
}
