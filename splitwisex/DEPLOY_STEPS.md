# Quick Deployment Steps

## Your Wallet Info:
- **Address**: `0x8BC38e23A9F42ECd0216d4724dc5f3c7Ce91962A`
- **Current Balance**: 0 MATIC (needs funding)

## Step 1: Get Testnet MATIC
Go to: https://faucet.polygon.technology/
- Select "Polygon Amoy"
- Enter: `0x8BC38e23A9F42ECd0216d4724dc5f3c7Ce91962A`
- Wait 1-2 minutes

## Step 2: Deploy Contract
```bash
cd contracts
npm run deploy:amoy
npm run export
```

## Step 3: Update Subgraph
```bash
cd ../subgraph
# Update contract address in subgraph.yaml
graph deploy ethglobal --version-label v0.0.4
```

## Step 4: Test Full Demo
- ✅ Web app: http://localhost:3000
- ✅ Real contract interactions
- ✅ Receipt uploads to Storacha
- ✅ Cross-chain settlement

You're 2 minutes away from a full working demo! 🚀