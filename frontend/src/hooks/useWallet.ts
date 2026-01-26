import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { WalletState } from '../types';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    account: '',
    provider: null,
    signer: null,
    chainId: 0,
    isConnected: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');

  const connect = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask not installed');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setWallet({
        account: address,
        provider,
        signer,
        chainId: Number(network.chainId),
        isConnected: true,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet({
      account: '',
      provider: null,
      signer: null,
      chainId: 0,
      isConnected: false,
    });
    setError('');
  }, []);

  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (wallet.isConnected && accounts[0] !== wallet.account) {
        connect();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [wallet.account, wallet.isConnected, connect, disconnect]);

  return {
    ...wallet,
    connect,
    disconnect,
    isConnecting,
    error,
  };
}
