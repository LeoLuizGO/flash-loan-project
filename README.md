# Flash Loan AMM Project 💸

Flash Loan project with automated market maker (AMM) arbitrage, built with Hardhat and integrated with Aave V3 protocol. This project demonstrates the implementation of flash loans on Ethereum, enabling instant uncollateralized loans for arbitrage opportunities between DEXs.

## 📋 About the Project

This project implements a Flash Loan smart contract with the following technologies:

- **Hardhat** - Ethereum development framework
- **Aave V3** - DeFi protocol for flash loans
- **Solidity** - Smart contract programming language
- **TypeScript** - For tests and scripts
- **Ethers.js** - Library for Ethereum interaction
- **React** - Frontend interface for executing flash loans

The `FlashLoanAMM.sol` contract extends `FlashLoanSimpleReceiverBase` from Aave and implements the necessary logic to execute flash loan operations with arbitrage between two AMM DEXs.

## 🚀 Quick Start Guide

### Prerequisites

Before starting, make sure you have:

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **MetaMask** browser extension
- Free **Alchemy account** ([Sign up](https://www.alchemy.com/))

### Step 1: Clone and Configure

```bash
cd Desktop
git clone <REPO_URL>
cd flash-loan-project

# Create .env file with your Alchemy key
# Windows: notepad .env
# Mac/Linux: nano .env
```

Add to `.env` file (replace with your key):
```bash
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY_HERE
```

### Step 2: Install Dependencies

```bash
npm install
cd frontend
npm install
cd ..
```

### Step 3: Compile Contracts

```bash
npx hardhat compile
```

### Step 4: Open 3 Terminals

**Terminal 1** (keep running):
```bash
npx hardhat node
```

**Terminal 2** (run once):
```bash
npx hardhat run scripts/full-setup.js --network localhost
```

**Terminal 3** (keep running):
```bash
cd frontend
npm start
```

### Step 5: Configure MetaMask

#### A) Add Network:
1. Open MetaMask
2. Click network selector (top)
3. "Add Network" > "Add network manually"
4. Fill in:
   - **Network Name**: Hardhat Local
   - **RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 31337
   - **Currency**: ETH

#### B) Import Test Account:
1. MetaMask > Account icon > "Import Account"
2. Paste this private key:
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
3. Click Import

### Step 6: Use the System

1. Open http://localhost:3000
2. Click "Connect MetaMask"
3. Enter amount (e.g., 10000)
4. Click "Generate Signature" (sign in MetaMask)
5. Click "Execute Flash Loan" (confirm in MetaMask)
6. See your profit!

## 🧪 Testing

Run all tests:
```bash
npx hardhat test
```

Run specific tests:
```bash

npx hardhat test

# Test flash loan via terminal
npx hardhat run scripts/test-flashloan.js --network localhost
```

## 📁 Project Structure

```
flash-loan-project/
├── contracts/              # Solidity smart contracts
│   ├── flashloanAMM.sol   # Main Flash Loan contract
│   ├── DexAMM.sol         # AMM DEX implementation
│   └── Dex.sol            # Alternative DEX
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Custom React hooks
│   │   └── utils/         # Utility functions
├── test/                  # Project tests
├── scripts/               # Deployment and utility scripts
│   ├── full-setup.js      # Complete setup script
│   ├── create-arbitrage.js # Create arbitrage opportunity
│   └── withdraw.js        # Withdraw accumulated profits
├── ignition/              # Ignition deployment modules
└── hardhat.config.js      # Hardhat configuration
```

## 🔧 Useful Commands

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Clean cache and artifacts
npx hardhat clean

# Run local node
npx hardhat node

# Deploy contracts
npx hardhat run scripts/full-setup.js --network localhost

# Create arbitrage opportunity
npx hardhat run scripts/create-arbitrage.js --network localhost

# Check accumulated profits
npx hardhat run scripts/withdraw.js --network localhost

# Add authorized signer
npx hardhat run scripts/add-signer.js --network localhost
```

## 🔍 Troubleshooting

### Error: "Arbitrage not profitable"
```bash
npx hardhat run scripts/create-arbitrage.js --network localhost
```

### Error: "Internal JSON-RPC error"
- Reload page (F5)
- Generate new signature
- Run create-arbitrage.js

### Error: "Nonce too high" in MetaMask
- MetaMask > Settings > Advanced > Clear activity tab data

### Error: Contracts not found
- Check if Terminal 1 is running
- Run full-setup.js again

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Aave V3 Docs](https://docs.aave.com/developers/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Ethers.js Documentation](https://docs.ethers.org/)

## ⚠️ Important Notes

- This project is for educational purposes
- Always test on testnets before using on mainnet
- Never share your private keys
- Flash loans must be repaid within the same transaction
- Arbitrage opportunities depend on price differences between DEXs

## 📄 License

MIT
