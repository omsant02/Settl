# SplitwiseX - Complete Setup & Demo Guide

## 🚀 Quick Start (Demo Ready)

Your project is **90% ready**! Here's how to run everything:

### Prerequisites
- Node.js 18+
- MetaMask with Polygon Amoy testnet configured
- Some Amoy MATIC (from faucet)

---

## 1. 📄 Contracts Setup

```bash
cd contracts

# Install dependencies
npm install

# Add your private key to .env (REQUIRED for real deployment)
# Replace the placeholder private key with your actual testnet private key
nano .env

# Deploy to Polygon Amoy testnet (requires testnet MATIC)
npm run deploy:amoy

# OR deploy to Polygon mainnet (requires ~$1-2 MATIC for gas)
npm run deploy:polygon

# Export ABI to web and subgraph folders
npm run export

# Optional: Verify contract on PolygonScan
npx hardhat verify --network polygonAmoy YOUR_CONTRACT_ADDRESS
```

**Current Status**: ✅ Code ready, ❌ Need real deployment

---

## 2. 📊 Subgraph (The Graph Studio)

```bash
cd ../subgraph

# Install dependencies
npm install

# Update contract address in subgraph.yaml (after deploying contract)
# Replace the placeholder address with your deployed contract address

# Generate types and build
graph codegen && graph build

# Deploy to The Graph Studio (already configured with your deploy key)
graph deploy ethglobal --version-label v0.0.3
```

**Current Status**: ✅ Deployed to Studio
- **Endpoint**: https://api.studio.thegraph.com/query/121313/ethglobal/v0.0.2
- **Studio**: https://thegraph.com/studio/subgraph/ethglobal

---

## 3. 🌐 Web Application

```bash
cd ../web

# Install dependencies
npm install

# Start development server
npm run dev
```

**Current Status**: ✅ Running on http://localhost:3001
- **Storacha IPFS**: ✅ Configured
- **LI.FI Route API**: ✅ Configured
- **The Graph**: ✅ Connected to Studio

---

## 🧪 Testing the Demo

### With Mock Data (Current State)
Since you don't have a real contract deployed yet, the app will show:
- ❌ No groups (subgraph has no real data)
- ❌ Wallet connection works but no contract interaction

### With Real Deployment (After contract deployment)
1. **Connect Wallet** (MetaMask to Polygon Amoy)
2. **Create Group**: Add members by address/ENS
3. **Add Expenses**: Upload receipt → IPFS, split among group
4. **View Balances**: See who owes whom
5. **Settle Debts**: Cross-chain settlement wizard

---

## 📋 Demo Workflow

### Step 1: Deploy Real Contract
```bash
cd contracts
# Add your testnet private key to .env
npm run deploy:amoy
npm run export
```

### Step 2: Update Subgraph
```bash
cd ../subgraph
# Update contract address in subgraph.yaml
graph deploy ethglobal --version-label v0.0.3
```

### Step 3: Seed Test Data
```bash
cd ../contracts
npm run seed:amoy  # Creates sample group + expenses
```

### Step 4: Demo the App
1. Open http://localhost:3001
2. Connect MetaMask (Polygon Amoy)
3. View groups and expenses
4. Try adding new expense with receipt upload
5. Test settlement flow

---

## 🔧 Configuration Files

### `/contracts/.env`
```bash
PRIVATE_KEY=0xYOUR_ACTUAL_PRIVATE_KEY_HERE
AMOY_RPC=https://rpc.amoy.polygon.technology
POLYGON_RPC=https://polygon-rpc.com
POLYGONSCAN_KEY=IA7QU9RMHVBBTW6QUMW3SKUNAHSRCCYV9V
```

### `/web/.env.local`
```bash
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/121313/ethglobal/v0.0.2
NEXT_PUBLIC_LEDGER_ADDRESS=YOUR_DEPLOYED_CONTRACT_ADDRESS
NEXT_PUBLIC_STORACHA_EMAIL=your_storacha_email@example.com
NEXT_PUBLIC_STORACHA_DID=your_storacha_did
NEXT_PUBLIC_ROUTE_API=https://li.quest/v1
```

---

## 🛠️ Troubleshooting

### Common Issues:

1. **"No groups found"**
   - ✅ Deploy real contract
   - ✅ Update subgraph with real address
   - ✅ Run seed script

2. **Receipt upload fails**
   - ✅ Check Storacha authentication
   - ✅ Verify internet connection

3. **Wallet connection issues**
   - ✅ Add Polygon Amoy to MetaMask
   - ✅ Get testnet MATIC from faucet

4. **Subgraph not updating**
   - ⏱️ Wait 5-10 minutes for indexing
   - ✅ Check contract address in subgraph.yaml

---

## 🌍 Network Configuration

### Polygon Networks

#### Polygon Amoy Testnet
- **Chain ID**: 80002
- **RPC**: https://rpc.amoy.polygon.technology
- **Explorer**: https://amoy.polygonscan.com/
- **Faucet**: https://faucet.polygon.technology/

#### Polygon Mainnet
- **Chain ID**: 137
- **RPC**: https://polygon-mainnet.infura.io/v3/YOUR_API_KEY
- **Explorer**: https://polygonscan.com/
- **Get MATIC**: Any major exchange (Binance, Coinbase, etc.)

### Add to MetaMask:
```
Network Name: Polygon Amoy
RPC URL: https://rpc.amoy.polygon.technology
Chain ID: 80002
Currency Symbol: MATIC
```

---

## 📈 Production Deployment

For mainnet deployment:
1. Deploy contract to Polygon mainnet
2. Update subgraph for `polygon` network
3. Deploy subgraph to decentralized network
4. Update web app environment variables

---

## 🎯 What's Working Right Now

✅ **Infrastructure**:
- The Graph Studio deployment
- Storacha IPFS integration
- LI.FI cross-chain routing
- MetaMask wallet connection

❌ **Missing for Full Demo**:
- Real contract deployment
- Test data seeding
- Updated subgraph with real contract

**Time to complete**: ~10 minutes (just deploy contract + update subgraph)

---

## 🔗 Useful Links

- **Subgraph Studio**: https://thegraph.com/studio/subgraph/ethglobal
- **Polygon Amoy Faucet**: https://faucet.polygon.technology/
- **Storacha Console**: https://console.storacha.network/
- **LI.FI Documentation**: https://docs.li.fi/

Your SplitwiseX project is ready for ETHGlobal! 🚀