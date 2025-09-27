# SplitwiseX Filecoin Integration

**Company-paid receipt storage on Filecoin using Synapse SDK**

## 🎯 Overview

This folder contains the dedicated Filecoin integration for SplitwiseX:

- **Company Pays**: Your company wallet pays for all storage costs
- **Users Upload Free**: Users can upload receipts without USDFC tokens
- **Synapse SDK**: Handles all Filecoin complexity automatically
- **Hackathon Ready**: Meets all Filecoin track requirements

## 📁 Structure

```
filecoin/
├── synapse/
│   └── ReceiptStorage.ts    # Main Synapse SDK integration (TypeScript)
├── lib/
│   └── index.ts             # Public API exports
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript configuration
└── .env.example             # Environment template
```

## 🚀 Quick Setup

### 1. Create Company Wallet & Get Tokens

```bash
# 1. Create wallet and get private key
# 2. Add Filecoin Calibration network to wallet
# 3. Get test tFIL: https://faucet.calibration.fildev.network/
# 4. Get test USDFC tokens (contact Synapse team)
```

### 2. Configure Environment

```bash
# Copy environment file
cp .env.example .env

# Add your company private key
COMPANY_PRIVATE_KEY=0xYourPrivateKeyHere
```

### 3. Install Dependencies

```bash
# Install TypeScript dependencies
npm install

# Build and type-check
npm run build
```

### 4. One-time Setup

```bash
# In your web app, call setup once:
curl -X POST http://localhost:3000/api/filecoin/status

# This approves the storage service
# Your wallet balance is managed via MetaMask
```

## 📡 API Endpoints

### Upload Receipt
```bash
POST http://localhost:3001/api/upload-receipt
Content-Type: multipart/form-data

# Form data:
# - file: Receipt image file
# - expenseId: Expense ID (optional)

# Response:
{
  "success": true,
  "pieceCid": "bafy...",
  "size": 1234567,
  "storageId": "filecoin:bafy..."
}
```

### Download Receipt
```bash
GET http://localhost:3001/api/download-receipt/:pieceCid

# Returns receipt image file
```

### Check Balance
```bash
# Just check your MetaMask wallet!
# Add USDFC token to see balance:
# Token Contract: (get from Synapse team)
# Network: Filecoin Calibration
```

## 🔧 Integration with Main App

### Frontend Integration
```javascript
// In your React components
const uploadToFilecoin = async (file, expenseId) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('expenseId', expenseId)

  const response = await fetch('http://localhost:3001/api/upload-receipt', {
    method: 'POST',
    body: formData
  })

  return await response.json()
}
```

### Backend Integration
```javascript
// Connect to your main database
import { receiptStorage } from './synapse/ReceiptStorage.js'

// Store receipt metadata in your database
await db.receipts.create({
  expenseId: expenseId,
  pieceCid: result.pieceCid,
  storageId: \`filecoin:\${result.pieceCid}\`,
  uploadedAt: new Date()
})
```

## 💰 Cost Management

### Monitor Costs
```bash
# Check current balance
npm run balance

# Expected output:
# 💵 USDFC Balance: $950.0
# ✅ Balance is sufficient for storage operations
```

### Payment Model
- **Initial Deposit**: $1000 USDFC
- **Per Epoch**: 100 USDFC
- **Lockup**: 500 USDFC for 180 days
- **Per Receipt**: ~$0.01-0.10 depending on size

## 🎉 Hackathon Compliance

✅ **Uses Synapse SDK**: Core integration in ReceiptStorage.js

✅ **Filecoin Calibration**: Configured for testnet

✅ **Working Demo**: Full upload/download functionality

✅ **Real Utility**: Expense receipt storage

✅ **Payment Rails**: USDFC payments for storage

✅ **Open Source**: All code available

## 🐛 Troubleshooting

### "COMPANY_PRIVATE_KEY not found"
```bash
# Make sure .env file has your private key
echo "COMPANY_PRIVATE_KEY=0xYourKeyHere" >> .env
```

### "Insufficient USDFC balance"
```bash
# Check balance
npm run balance

# If low, contact Synapse team for test USDFC
```

### "Failed to initialize Synapse"
```bash
# Check network connection and private key format
# Private key should start with 0x
```

## 🚀 Ready for Demo!

Once setup is complete:

1. ✅ Company wallet funded with USDFC
2. ✅ Payments configured via `npm run setup`
3. ✅ Server running on port 3001
4. ✅ Receipts uploading to Filecoin
5. ✅ Storage IDs like "filecoin:bafy..." appearing

**Your SplitwiseX app now has enterprise-grade receipt storage on Filecoin!** 🎯