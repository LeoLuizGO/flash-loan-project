import { ethers } from 'ethers';

export interface DexInfo {
  address: string;
  name: string;
  price: bigint;
  daiBalance: bigint;
  wethBalance: bigint;
}

export interface AMMInfo {
  dexA: DexInfo;
  dexB: DexInfo;
  priceDifference: number;
  isProfitable: boolean;
}

export interface Transaction {
  hash: string;
  type: 'flash_loan' | 'swap' | 'withdraw';
  token: string;
  amount: string;
  profit?: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
}

export interface FlashLoanParams {
  token: string;
  amount: string;
  maxSlippageBps: number;
  nonce: number;
  signature: string;
}

export interface WalletState {
  account: string;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  chainId: number;
  isConnected: boolean;
}

export interface ContractAddresses {
  flashLoan: string;
  dexA: string;
  dexB: string;
  dai: string;
  weth: string;
}
