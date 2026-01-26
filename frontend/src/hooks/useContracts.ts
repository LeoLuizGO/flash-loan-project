import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import FlashLoanABI from '../contracts/FlashLoan.json';
import DexAMMABI from '../contracts/DexAMM.json';
import { FLASH_LOAN_ADDRESS } from '../utils/constants';
import { AMMInfo, DexInfo } from '../types';

export function useContracts(signer: ethers.Signer | null, provider: ethers.BrowserProvider | null) {
  const [flashLoanContract, setFlashLoanContract] = useState<ethers.Contract | null>(null);
  const [dexAContract, setDexAContract] = useState<ethers.Contract | null>(null);
  const [dexBContract, setDexBContract] = useState<ethers.Contract | null>(null);
  const [dexAAddress, setDexAAddress] = useState<string>('');
  const [dexBAddress, setDexBAddress] = useState<string>('');
  const [ammInfo, setAmmInfo] = useState<AMMInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Initialize contracts
  useEffect(() => {
    if (!signer) {
      setFlashLoanContract(null);
      setDexAContract(null);
      setDexBContract(null);
      return;
    }

    const initContracts = async () => {
      try {
        const flashLoan = new ethers.Contract(
          FLASH_LOAN_ADDRESS,
          FlashLoanABI,
          signer
        );
        setFlashLoanContract(flashLoan);

        // Get DEX addresses from FlashLoan contract
        const dexA = await flashLoan.dexA();
        const dexB = await flashLoan.dexB();

        setDexAAddress(dexA);
        setDexBAddress(dexB);

        // Initialize DEX contracts
        const dexAInstance = new ethers.Contract(dexA, DexAMMABI, signer);
        const dexBInstance = new ethers.Contract(dexB, DexAMMABI, signer);

        setDexAContract(dexAInstance);
        setDexBContract(dexBInstance);
      } catch (err: any) {
        console.error('Error initializing contracts:', err);
        setError(err.message || 'Failed to initialize contracts');
      }
    };

    initContracts();
  }, [signer]);

  // Fetch AMM info
  const fetchAMMInfo = useCallback(async () => {
    if (!flashLoanContract || !dexAContract || !dexBContract) return;

    setIsLoading(true);
    setError('');

    try {
      // Fetch all data in parallel
      const [
        priceA,
        priceB,
        daiBalanceA,
        wethBalanceA,
        daiBalanceB,
        wethBalanceB,
      ] = await Promise.all([
        dexAContract.getPrice(),
        dexBContract.getPrice(),
        dexAContract.getDAIBalance(),
        dexAContract.getWETHBalance(),
        dexBContract.getDAIBalance(),
        dexBContract.getWETHBalance(),
      ]);

      const dexA: DexInfo = {
        address: dexAAddress,
        name: 'DEX A',
        price: priceA,
        daiBalance: daiBalanceA,
        wethBalance: wethBalanceA,
      };

      const dexB: DexInfo = {
        address: dexBAddress,
        name: 'DEX B',
        price: priceB,
        daiBalance: daiBalanceB,
        wethBalance: wethBalanceB,
      };

      // Calculate price difference percentage
      const numA = Number(priceA);
      const numB = Number(priceB);
      const diff = Math.abs(numA - numB);
      const avg = (numA + numB) / 2;
      const priceDifference = avg > 0 ? (diff / avg) * 100 : 0;

      // Profitable if price difference > 0.6% (covers 2x 0.3% AMM fees)
      const isProfitable = priceDifference > 0.6;

      setAmmInfo({
        dexA,
        dexB,
        priceDifference,
        isProfitable,
      });
    } catch (err: any) {
      console.error('Error fetching AMM info:', err);
      setError(err.message || 'Failed to fetch AMM info');
    } finally {
      setIsLoading(false);
    }
  }, [flashLoanContract, dexAContract, dexBContract, dexAAddress, dexBAddress]);

  // Auto-refresh AMM info
  useEffect(() => {
    if (!flashLoanContract || !dexAContract || !dexBContract) return;

    fetchAMMInfo();

    const interval = setInterval(fetchAMMInfo, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [flashLoanContract, dexAContract, dexBContract, fetchAMMInfo]);

  return {
    flashLoanContract,
    dexAContract,
    dexBContract,
    dexAAddress,
    dexBAddress,
    ammInfo,
    isLoading,
    error,
    refreshAMMInfo: fetchAMMInfo,
  };
}
