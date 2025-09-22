# IPFS & Filecoin Integration Setup Guide

This guide explains how to set up and use the IPFS and Filecoin Protocol Labs integration in the SplitwiseX application.

## Overview

SplitwiseX uses a dual-layer storage approach:
1. **IPFS (via Storacha)** - Immediate decentralized storage for receipts
2. **Filecoin** - Permanent archival storage via Protocol Labs infrastructure

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Wallet connected (MetaMask or similar)
- Email address for Storacha authentication

## Setup Instructions

### 1. Install Storacha CLI

```bash
# Install the Storacha CLI globally
npm install -g @storacha/cli
```

### 2. Authenticate with Storacha

```bash
# Login with your email address
npx @storacha/cli login your-email@example.com
```

**Important**: You will receive an email with an authorization link. Click it to authorize the agent.

### 3. Set Current Space

```bash
# List available spaces
npx @storacha/cli space ls

# Use a space (replace with your actual space DID)
npx @storacha/cli space use did:key:z6MkqbfNzDJCN7XQXgRqtq1WSyJ9KdwSjZrKQMmTNGWGz5CJ
```

### 4. Verify Authentication

```bash
# Check your DID
npx @storacha/cli whoami
```

### 5. Environment Configuration

Update your `.env.local` file with your credentials:

```env
# IPFS Storage - Storacha (Protocol Labs)
NEXT_PUBLIC_STORACHA_EMAIL=your-email@example.com
NEXT_PUBLIC_STORACHA_DID=did:key:z6MkqbfNzDJCN7XQXgRqtq1WSyJ9KdwSjZrKQMmTNGWGz5CJ

# Subgraph and Contract Configuration
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/121313/ethglobal-2/v1.0.0
NEXT_PUBLIC_LEDGER_ADDRESS=0x26c1450c8f5B5769577c564372522644168e1224
```

## How It Works

### Storage Flow

1. **Receipt Upload** → User selects receipt image in AddExpenseForm
2. **IPFS Upload** → File uploaded to IPFS via Storacha CLI (`/api/upload-storacha`)
3. **Real CID Generated** → Returns actual IPFS CID (e.g., `bafybeid4seqw4xzkfofrf2j4qyx5vnboxweg4qwg3uos3nu7nvwngxz76m`)
4. **Blockchain Transaction** → Expense added to smart contract with IPFS CID
5. **Filecoin Deal** → Receipt archived on Filecoin for permanent storage (`/api/pin`)

### File Structure

```
lib/
├── ipfs.ts                 # Main IPFS/storage functions
└── queries.ts             # Subgraph queries

app/api/
├── upload-storacha/       # IPFS upload via Storacha CLI
└── pin/                   # Filecoin deal creation

components/
├── AddExpenseForm.tsx     # Receipt upload & expense creation
├── Balances.tsx          # View consolidated balances
└── FilecoinStorage.tsx   # Filecoin storage component
```

## Key Functions

### `uploadReceipt(file: File)`
- **Location**: `lib/ipfs.ts`
- **Purpose**: Upload receipt to IPFS via Storacha
- **Returns**: Real IPFS CID
- **Fallback**: Content-based CID if Storacha fails

### `createFilecoinDeal(expenseId, cid, payerAddress)`
- **Location**: `lib/ipfs.ts`
- **Purpose**: Create Filecoin deal for permanent storage
- **API**: Calls `/api/pin` endpoint
- **Returns**: `{dealId, jobId, txHash}`

### `ipfsGateway(cid)`
- **Location**: `lib/ipfs.ts`
- **Purpose**: Generate IPFS gateway URLs
- **Gateways**: `ipfs.io`, `storacha.link`, `cloudflare-ipfs.com`

## API Endpoints

### `/api/upload-storacha`
- **Method**: POST
- **Purpose**: Upload files to IPFS via Storacha CLI
- **Input**: FormData with file
- **Output**: `{success: true, cid: "bafybei..."}`

### `/api/pin`
- **Method**: POST
- **Purpose**: Create Filecoin deals for permanent storage
- **Input**: `{expenseId, cid, payerAddress}`
- **Output**: `{dealId, jobId, status}`

## Testing the Integration

### 1. Test CLI Upload

```bash
# Create test file
echo "test receipt content" > test-receipt.txt

# Upload to IPFS
npx @storacha/cli up test-receipt.txt

# Should return: https://storacha.link/ipfs/bafybei...
```

### 2. Test in Application

1. **Add Expense** → Upload receipt in the form
2. **Check Console** → Look for "Receipt uploaded successfully with CID:"
3. **Verify IPFS** → Visit `https://ipfs.io/ipfs/{your-cid}`
4. **Check Filecoin** → Look for "Filecoin deal created:" in console

### 3. Debug Tools

- **Console Logs**: Check browser console for detailed upload flow
- **Refresh Button**: Use "🔄 Refresh Expenses" if expenses don't appear
- **Test Subgraph**: Use "🔍 Test Subgraph" to verify data queries

## Common Issues & Solutions

### Issue: "missing current space"
```bash
# Solution: Set current space
npx @storacha/cli space use did:key:your-space-did
```

### Issue: "Authentication failed"
```bash
# Solution: Re-authenticate
npx @storacha/cli login your-email@example.com
# Check email and click authorization link
```

### Issue: "No expenses yet" after adding
- **Cause**: Subgraph indexing delay
- **Solution**: Wait 30-60 seconds, then click "🔄 Refresh Expenses"

### Issue: Filecoin deal creation skipped
- **Cause**: Expense ID extraction failed
- **Solution**: Check transaction logs, fallback mechanism will retry

## Verification

### Verify IPFS Storage
```bash
# Check if CID is accessible
curl -I https://ipfs.io/ipfs/your-cid-here
```

### Verify Storacha Authentication
```bash
# Should return your DID
npx @storacha/cli whoami
```

### Verify Environment Variables
```javascript
// In browser console
console.log({
  email: process.env.NEXT_PUBLIC_STORACHA_EMAIL,
  did: process.env.NEXT_PUBLIC_STORACHA_DID,
  subgraph: process.env.NEXT_PUBLIC_SUBGRAPH_URL
})
```

## Architecture Benefits

1. **Decentralized**: Files stored on IPFS, not centralized servers
2. **Permanent**: Filecoin provides long-term archival storage
3. **Accessible**: Multiple gateway options for file access
4. **Reliable**: Fallback mechanisms ensure upload success
5. **Transparent**: All storage linked to blockchain transactions

## Gateway URLs

Your receipts are accessible via multiple gateways:

- **IPFS.io**: `https://ipfs.io/ipfs/{cid}`
- **Storacha**: `https://storacha.link/ipfs/{cid}`
- **Cloudflare**: `https://cloudflare-ipfs.com/ipfs/{cid}`
- **Dweb**: `https://dweb.link/ipfs/{cid}`

## Security Notes

- **DID Security**: Your DID is your decentralized identity - keep it secure
- **Email Privacy**: Only used for Storacha authentication
- **Local Storage**: CLI credentials stored locally, not in code
- **Blockchain Integration**: All storage references immutably recorded on-chain

## Support

For issues with:
- **Storacha**: Check [Storacha documentation](https://docs.storacha.network/)
- **Protocol Labs**: Visit [IPFS documentation](https://docs.ipfs.tech/)
- **Application**: Check console logs and use debug buttons in UI