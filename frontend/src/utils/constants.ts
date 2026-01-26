export const RPC_URL = 'http://127.0.0.1:8545';

// Token Addresses (Mainnet)
export const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
export const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

// Contract Addresses - Update these after deployment
export const FLASH_LOAN_ADDRESS = '0x64f5219563e28EeBAAd91Ca8D31fa3b36621FD4f';
export const DEX_A_ADDRESS = '0xa85EffB2658CFd81e0B1AaD4f2364CdBCd89F3a1'; // Update after deployment
export const DEX_B_ADDRESS = '0x8aAC5570d54306Bb395bf2385ad327b7b706016b'; // Update after deployment

// Slippage Presets (in basis points)
export const SLIPPAGE_PRESETS = [
  { label: '0.5%', value: 50 },
  { label: '1%', value: 100 },
  { label: '2%', value: 200 },
  { label: '5%', value: 500 },
];

// Token Info
export const TOKENS = {
  [DAI_ADDRESS]: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    icon: '/dai-icon.svg',
  },
  [WETH_ADDRESS]: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    icon: '/weth-icon.svg',
  },
};

// Aave Flash Loan Fee (0.05% on mainnet)
export const AAVE_FLASH_LOAN_FEE_BPS = 5;

// AMM Fee (0.3% like Uniswap)
export const AMM_FEE_BPS = 30;
