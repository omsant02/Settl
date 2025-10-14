# SplitWise - Web3 Expense Splitting dApp

A decentralized expense splitting application built on Ethereum with ENS subdomain integration, 1inch Fusion for cross-chain settlements, and Filecoin Lighthouse for receipt storage.

## Features

- **ENS Subdomain Integration**: Users get personalized subdomains (e.g., `alice.settl.eth`)
- **Group Expense Management**: Create groups and split expenses with ENS names
- **Cross-Chain Settlements**: Settle debts using 1inch Fusion (any token, any chain)
- **Receipt Storage**: Upload receipts to IPFS via Filecoin Lighthouse
- **Balance Tracking**: Automatic debt tracking between users

## Smart Contract

- **Network**: Sepolia Testnet
- **Contract Address**: `0x55CE355b27CE66995aF0cDC7204c331aCb830ba5`
- **ENS Domain**: `settl.eth`
- **Verified**: [View on Etherscan](https://sepolia.etherscan.io/address/0x55ce355b27ce66995af0cdc7204c331acb830ba5)

## Quick Start

### Prerequisites
- Node.js & npm
- Foundry
- MetaMask with Sepolia ETH

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd SplitsContracts

# Install dependencies
forge install

# Set up environment variables
cp .env.example .env
# Add your PRIVATE_KEY, SEPOLIA_RPC_URL, and ETHERSCAN_API_KEY
```

### Build & Deploy

```bash
# Build the contract
forge build

# Deploy to Sepolia
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify

# Run tests
forge test -vv
```

## Usage Flow

### 1. Register as User
```bash
cast send <CONTRACT_ADDRESS> "registerUser(string)" "yourusername" --rpc-url sepolia --private-key $PRIVATE_KEY
```

### 2. Create a Group
```bash
cast send <CONTRACT_ADDRESS> "createGroup(string,string[])" "Trip to Goa" ["alice","bob"] --rpc-url sepolia --private-key $PRIVATE_KEY
```

### 3. Add an Expense
```bash
cast send <CONTRACT_ADDRESS> "addExpense(uint256,uint256,string,string,string,string[],uint256[])" 1 1000 "Hotel" "Accommodation" "QmIPFSHash" ["alice","bob"] [500,500] --rpc-url sepolia --private-key $PRIVATE_KEY
```

### 4. Settle Expense (After 1inch Transaction)
```bash
cast send <CONTRACT_ADDRESS> "settleExpense(uint256,uint256,string,string,string)" 1 0 "0x1inch_tx_hash" "USDC" "ETH" --rpc-url sepolia --private-key $PRIVATE_KEY
```

## Core Functions

| Function | Description |
|----------|-------------|
| `registerUser(string subdomain)` | Register and get ENS subdomain |
| `createGroup(string name, string[] members)` | Create expense group |
| `addExpense(...)` | Add expense with custom splits |
| `settleExpense(...)` | Record settlement after payment |
| `resolveSubdomain(string subdomain)` | Get address from ENS name |
| `getUserBalance(address debtor, address creditor)` | Check balance owed |

## Tech Stack

- **Smart Contracts**: Solidity 0.8.19
- **Development Framework**: Foundry
- **ENS Integration**: NameWrapper for subdomain creation
- **Settlement Layer**: 1inch Fusion (off-chain, SDK integration)
- **Storage**: Filecoin Lighthouse (IPFS)

## Project Structure

```
SplitsContracts/
├── src/
│   └── SplitWiseApp.sol          # Main contract
├── script/
│   └── Deploy.s.sol               # Deployment script
├── test/
│   └── SplitWiseApp.t.sol        # Tests
├── foundry.toml                   # Foundry config
└── README.md
```

## Sponsor Technologies

### ENS (Ethereum Name Service)
- Users receive subdomains under `settl.eth`
- Human-readable names replace wallet addresses
- Automatic forward and reverse resolution

### 1inch Fusion
- Cross-chain expense settlements
- Users pay in any token they have
- Recipients receive in their preferred token
- Transaction hashes stored on-chain

### Filecoin Lighthouse
- Decentralized receipt storage
- IPFS hashes stored in contract
- Permanent, verifiable proof of expenses

## Testing

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vv

# Run specific test
forge test --match-test testUserRegistration -vv

# Gas report
forge test --gas-report
```

## Security Notes

⚠️ **Important**: The private key used in this project has been exposed. For production:
1. Use hardware wallets
2. Never share private keys
3. Use environment variables properly
4. Implement proper access controls

## Future Enhancements

- [ ] Frontend React application
- [ ] Mobile app (React Native)
- [ ] Multi-currency support
- [ ] Recurring expense automation
- [ ] Integration with additional DEX aggregators
- [ ] L2 deployment (Optimism, Arbitrum)

## License

MIT

## Built For

ETHGlobal New Delhi Hackathon 2025

## Contact

- GitHub: [Your GitHub]
- Twitter: [Your Twitter]
- ENS: `settl.eth` (Sepolia)
