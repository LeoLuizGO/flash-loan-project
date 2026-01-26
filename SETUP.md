# Flash Loan AMM - Complete Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **MetaMask** browser extension
3. **Alchemy/Infura account** for mainnet RPC URL

## Environment Setup

### 1. Create `.env` file in project root

```bash
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### 2. Install dependencies

```bash
# Root project (Hardhat + contracts)
npm install

# Frontend
cd frontend
npm install
cd ..
```

## Quick Start (Recommended)

### Option A: All-in-One Setup

```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Terminal 2: Run full setup (in another terminal)
npx hardhat run scripts/full-setup.js --network localhost
```

This single command will:
- Deploy DexAMM #1 and #2
- Deploy FlashLoanAMM
- Add 1M DAI + 500 WETH liquidity to each DEX
- Create a price difference for arbitrage
- Add deployer as authorized signer
- Update frontend constants

### Option B: Step-by-Step Setup

```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Terminal 2: Run scripts in order
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/setup-liquidity.js --network localhost
npx hardhat run scripts/create-arbitrage.js --network localhost
npx hardhat run scripts/add-signer.js --network localhost
```

## Start Frontend

```bash
cd frontend
npm start
```

The app will open at `http://localhost:3000`

## MetaMask Configuration

### 1. Add Localhost Network

1. Open MetaMask
2. Click on network dropdown
3. "Add Network" > "Add network manually"
4. Fill in:
   - Network Name: `Hardhat Localhost`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`

### 2. Import Test Account

Hardhat provides test accounts with 10,000 ETH each. Import one:

**Account #0 (Deployer):**
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

1. MetaMask > Account icon > "Import Account"
2. Paste private key
3. Click "Import"

## How to Use

### 1. Connect Wallet
Click "Connect MetaMask" and select the imported account.

### 2. View DEX Information
The dashboard shows:
- Price on each DEX
- Liquidity reserves (DAI/WETH)
- Price difference percentage
- Whether arbitrage is profitable

### 3. Execute Flash Loan

1. **Select Token**: DAI or WETH
2. **Enter Amount**: e.g., 10000 (DAI) or 5 (WETH)
3. **Set Slippage**: Default 1% is usually fine
4. **Generate Signature**: Click to sign with MetaMask
5. **Execute Flash Loan**: Click to execute the arbitrage

### 4. Check Results
- Transaction status shows in the status bar
- Transaction history shows all past transactions
- Profits remain in the FlashLoanAMM contract

## Troubleshooting

### "Signature already used"
Each signature can only be used once. Generate a new signature.

### "Unauthorized signer"
Your account is not authorized. Run:
```bash
npx hardhat run scripts/add-signer.js --network localhost
```

### "Arbitrage not profitable"
The price difference is too small. Run:
```bash
npx hardhat run scripts/create-arbitrage.js --network localhost
```

### "MetaMask - RPC Error"
Make sure:
1. Hardhat node is running (`npx hardhat node`)
2. MetaMask is connected to localhost:8545
3. Account has ETH for gas

### Frontend not loading prices
1. Check browser console for errors
2. Verify contract addresses in `frontend/src/utils/constants.ts`
3. Restart frontend after updating constants

## Project Structure

```
flash-loan-project/
├── contracts/
│   ├── DexAMM.sol           # AMM DEX contract
│   └── flashloanAMM.sol     # Flash loan + arbitrage
├── scripts/
│   ├── deploy.js            # Deploy contracts
│   ├── setup-liquidity.js   # Add liquidity
│   ├── create-arbitrage.js  # Create price diff
│   ├── add-signer.js        # Add authorized signer
│   └── full-setup.js        # All-in-one script
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── contracts/       # ABIs
│   │   └── utils/           # Constants & helpers
│   └── package.json
├── test/                    # Test files
├── deployment.json          # Deployed addresses
└── hardhat.config.js
```

## Running Tests

```bash
npx hardhat test
```

Or specific test file:
```bash
npx hardhat test test/flashloanAMM.test.js
```

## Understanding the Arbitrage

### DAI Flash Loan Path
1. Borrow DAI from Aave
2. Buy WETH where price is higher (cheaper WETH)
3. Sell WETH where price is lower (expensive WETH)
4. Repay DAI + 0.05% fee
5. Keep profit

### WETH Flash Loan Path
1. Borrow WETH from Aave
2. Sell WETH where price is lower (more DAI)
3. Buy WETH where price is higher (less DAI)
4. Repay WETH + 0.05% fee
5. Keep profit

### Price Interpretation
- Price = WETH per DAI (scaled by 1e18)
- Higher price = More WETH per DAI = Cheaper WETH
- Need >0.6% price diff to profit (covers 2x 0.3% AMM fees)

## Security Features

1. **EIP-191 Signatures**: All requests must be signed
2. **Authorized Signers**: Whitelist of allowed signers
3. **Replay Protection**: Each signature has a unique nonce
4. **Slippage Protection**: Minimum output enforced on swaps
5. **Reentrancy Guards**: DEX swaps are protected

## License

MIT
