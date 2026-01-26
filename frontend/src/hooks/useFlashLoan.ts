import { useState, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { Transaction } from '../types';
import { FLASH_LOAN_ADDRESS } from '../utils/constants';

export function useFlashLoan(
  flashLoanContract: ethers.Contract | null,
  signer: ethers.Signer | null,
  account: string
) {
  // Use timestamp-based nonce to avoid conflicts with previously used nonces
  const [nonce, setNonce] = useState(() => Math.floor(Date.now() / 1000));
  const [signature, setSignature] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Use ref to track the nonce used in the last signature
  const signedNonceRef = useRef(0);

  const generateSignature = useCallback(
    async (token: string, amount: string): Promise<string | null> => {
      if (!signer || !account) {
        setError('Wallet not connected');
        return null;
      }

      setIsLoading(true);
      setError('');

      try {
        const currentNonce = nonce;
        signedNonceRef.current = currentNonce;

        const amountWei = ethers.parseEther(amount);

        // Create message hash matching contract's format
        const messageHash = ethers.solidityPackedKeccak256(
          ['address', 'uint256', 'uint256', 'address'],
          [token, amountWei, currentNonce, FLASH_LOAN_ADDRESS]
        );

        // Sign with personal_sign (adds Ethereum prefix)
        const sig = await signer.signMessage(ethers.getBytes(messageHash));

        setSignature(sig);
        setNonce(currentNonce + 1);
        return sig;
      } catch (err: any) {
        console.error('Error generating signature:', err);
        setError(err.message || 'Failed to generate signature');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [signer, account, nonce]
  );

  const executeFlashLoan = useCallback(
    async (
      token: string,
      amount: string,
      maxSlippageBps: number,
      sig?: string
    ): Promise<boolean> => {
      if (!flashLoanContract || !signer) {
        setError('Contract not initialized');
        return false;
      }

      const signatureToUse = sig || signature;
      if (!signatureToUse) {
        setError('No signature available');
        return false;
      }

      if (signedNonceRef.current === 0) {
        setError('Please generate a signature first');
        return false;
      }

      setIsLoading(true);
      setError('');

      const txRecord: Transaction = {
        hash: '',
        type: 'flash_loan',
        token,
        amount,
        status: 'pending',
        timestamp: Date.now(),
      };

      try {
        const amountWei = ethers.parseEther(amount);

        // Add transaction to history as pending
        setTransactions((prev) => [txRecord, ...prev]);

        // Use the nonce that was used when signing
        const tx = await flashLoanContract.requestFlashLoan(
          token,
          amountWei,
          maxSlippageBps,
          signedNonceRef.current,
          signatureToUse
        );

        txRecord.hash = tx.hash;
        setTransactions((prev) =>
          prev.map((t) => (t.timestamp === txRecord.timestamp ? { ...t, hash: tx.hash } : t))
        );

        const receipt = await tx.wait();

        // Parse events to get profit info
        let profit = '0';
        for (const log of receipt.logs) {
          try {
            const parsed = flashLoanContract.interface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
            if (parsed?.name === 'FlashLoanExecuted') {
              profit = ethers.formatEther(parsed.args.profit);
            }
          } catch {
            // Skip logs that don't match our ABI
          }
        }

        // Update transaction status
        setTransactions((prev) =>
          prev.map((t) =>
            t.hash === tx.hash ? { ...t, status: 'success', profit } : t
          )
        );

        // Clear signature after successful execution
        setSignature('');

        return true;
      } catch (err: any) {
        console.error('Error executing flash loan:', err);

        // Update transaction status to failed
        setTransactions((prev) =>
          prev.map((t) =>
            t.timestamp === txRecord.timestamp ? { ...t, status: 'failed' } : t
          )
        );

        // Parse revert reason
        let errorMessage = err.message || 'Transaction failed';
        if (err.reason) {
          errorMessage = err.reason;
        } else if (err.data?.message) {
          errorMessage = err.data.message;
        }

        setError(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [flashLoanContract, signer, signature]
  );

  const clearError = useCallback(() => {
    setError('');
  }, []);

  return {
    nonce,
    signature,
    isLoading,
    error,
    transactions,
    generateSignature,
    executeFlashLoan,
    clearError,
  };
}
