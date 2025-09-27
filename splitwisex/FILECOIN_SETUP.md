# Filecoin Integration Setup Guide

This guide walks you through setting up SplitwiseX with Filecoin storage using the Synapse SDK.

## Architecture Overview

- **Company Pays Model**: Your company wallet pays for all storage, users upload receipts for free
- **Server-side Upload**: Uses Synapse SDK on the backend (more reliable)
- **Client-side Fallback**: Falls back to browser upload if server fails
- **Qualification Requirements**: Uses Synapse SDK, deploys to Filecoin Calibration, includes working demo

## 🚀 Quick Setup Steps

### 1. Create Company Wallet & Get Test USDFC

```bash
# 1. Create a new wallet for your company
# You can use MetaMask or any Ethereum wallet

# 2. Get the private key from your wallet
# ⚠️ NEVER share this private key - it's for your company wallet only

# 3. Add Filecoin Calibration Testnet to your wallet:
# - Network Name: Filecoin Calibration
# - RPC URL: https://api.calibration.node.glif.io/rpc/v1
# - Chain ID: 314159
# - Currency: tFIL
# - Block Explorer: https://calibration.filfox.info/

# 4. Get test tFIL from faucet:
# Visit: https://faucet.calibration.fildev.network/
# Enter your wallet address

# 5. Get test USDFC (for storage payments):
# This might need to be obtained from Synapse team or faucet
```

### 2. Configure Environment Variables

```bash
# Copy the example file
cp /Users/apple/Desktop/solidity-basics/splitwisex/web/.env.local.example /Users/apple/Desktop/solidity-basics/splitwisex/web/.env.local

# Edit .env.local and add your company private key:
COMPANY_PRIVATE_KEY=0xYOUR_COMPANY_PRIVATE_KEY_HERE
PRIVATE_KEY=0xYOUR_COMPANY_PRIVATE_KEY_HERE
```

### 3. Deploy Smart Contracts to Filecoin

```bash
cd /Users/apple/Desktop/solidity-basics/splitwisex/contracts

# Deploy to Filecoin Calibration testnet
npx hardhat run scripts/deploy.ts --network filecoinCalibration

# Copy the deployed contract address to your web .env.local:
# NEXT_PUBLIC_LEDGER_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

### 4. Initialize Filecoin Payments (One-time Setup)

```bash
cd /Users/apple/Desktop/solidity-basics/splitwisex/web

# Start the development server
npm run dev

# In another terminal, setup payments:
curl -X POST http://localhost:3000/api/filecoin/status

# This will:
# - Deposit 1000 USDFC for storage
# - Approve storage service with 100 USDFC per epoch
# - Set up 500 USDFC lockup for 180 days
```

### 5. Test the Integration

```bash
# Check service status
curl http://localhost:3000/api/filecoin/status

# Expected response:
{
  "status": "ready",
  "service": "Filecoin Receipt Storage via Synapse SDK",
  "balance": "$1000.0 USDFC",
  "network": "Filecoin Calibration",
  "initialized": true
}
```

## 🎯 Hackathon Qualification Checklist

✅ **Uses Synapse SDK**: Server-side integration in \`lib/filecoin-receipt-storage.ts\`

✅ **Deploys to Filecoin Calibration**: Contract deployment configured in \`hardhat.config.ts\`

✅ **Working Demo**: Receipt upload/download functionality in SplitwiseX UI

✅ **Open Source**: All code available on GitHub

✅ **Real-world Utility**: Expense tracking with immutable receipt storage

✅ **Seamless UX**: Users upload receipts without knowing about Filecoin complexity

✅ **Payment Rails**: Company pays for storage using USDFC

## 🔧 API Endpoints

### Upload Receipt
```bash
POST /api/filecoin/upload
Content-Type: multipart/form-data

# Body:
# - file: File (the receipt image)
# - expenseId: string (optional)
```

### Download Receipt
```bash
GET /api/filecoin/download/[pieceCid]
# Returns the receipt file
```

### Service Status
```bash
GET /api/filecoin/status
# Returns service health and balance info

POST /api/filecoin/status
# One-time setup of payment infrastructure
```

## 🏗️ Code Structure

```
splitwisex/
├── contracts/                    # Smart contracts
│   ├── hardhat.config.ts        # Filecoin network config
│   └── scripts/deploy.ts        # Deployment script
├── web/
│   ├── lib/
│   │   ├── filecoin-receipt-storage.ts  # Server-side Synapse SDK
│   │   ├── filecoin-storage.ts          # Client-side backup
│   │   └── ipfs.ts                      # Upload orchestration
│   └── app/api/filecoin/        # Filecoin API routes
│       ├── upload/route.ts      # Receipt upload
│       ├── download/[pieceCid]/route.ts # Receipt download
│       └── status/route.ts      # Service status
```

## 🚨 Important Notes

1. **Private Key Security**: Never commit private keys to git. Use environment variables only.

2. **Company Pays Model**: Your company wallet pays for all storage. Budget accordingly.

3. **Testnet Only**: This setup is for Calibration testnet. For mainnet, change network configs.

4. **Balance Monitoring**: Monitor your USDFC balance regularly to ensure uninterrupted service.

5. **Backup Strategy**: Client-side upload is available as fallback if server fails.

## 🐛 Troubleshooting

### "Actor not found" error during deployment
- Your wallet needs test tFIL from the faucet
- Make sure you're using the correct private key

### "Insufficient balance" during payment setup
- You need test USDFC tokens for storage payments
- Contact Synapse team for USDFC testnet tokens

### "Failed to initialize Synapse SDK"
- Check your private key format (should start with 0x)
- Verify network configuration in environment

## 🎉 Success Criteria

When everything is working, you should see:

1. ✅ Contracts deployed to Filecoin Calibration
2. ✅ Receipt uploads working via `/api/filecoin/upload`
3. ✅ Receipt downloads working via `/api/filecoin/download/[cid]`
4. ✅ Service showing "ready" status with USDFC balance
5. ✅ Expenses in SplitwiseX showing Filecoin storage IDs like `filecoin:bafy...`

**Ready for hackathon submission! 🚀**