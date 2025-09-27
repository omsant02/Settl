# Filecoin Integration in SplitwiseX

This document provides a comprehensive overview of Filecoin integration in the SplitwiseX application. The integration uses the Synapse SDK to store expense receipts on the Filecoin network with a "company pays" model, where users can upload receipts for free.

## Architecture Overview

- **Storage Model**: Company wallet pays for all storage on Filecoin
- **Network**: Uses Filecoin Calibration testnet
- **SDK**: Uses [@filoz/synapse-sdk](https://www.npmjs.com/package/@filoz/synapse-sdk) for Filecoin interactions
- **Implementation**: Server-side API routes with client fallback

## Key Files

### Core Filecoin Implementation

1. **`/filecoin/synapse/ReceiptStorage.ts`**
   - Core implementation class for Filecoin storage
   - Handles receipt upload, download, and payment setup
   - Used by the server-side components

2. **`/filecoin/lib/index.ts`**
   - Exports ReceiptStorage functionality
   - Provides helper functions and type definitions

3. **`/web/lib/filecoin-receipt-storage.ts`**
   - Server-side implementation of Filecoin storage
   - Used by API routes to handle uploads and downloads
   - Manages Synapse SDK initialization and token balances

4. **`/web/lib/filecoin-storage.ts`**
   - Client-side helper functions for Filecoin storage
   - Used for browser-based uploads and downloads

### API Routes

5. **`/web/app/api/filecoin/upload/route.ts`**
   - Server-side upload endpoint
   - Processes file uploads and stores them on Filecoin
   - Returns Filecoin piece CID and metadata

6. **`/web/app/api/filecoin/download/[pieceCid]/route.ts`**
   - Server-side download endpoint
   - Retrieves files from Filecoin by piece CID
   - Serves files to clients

7. **`/web/app/api/filecoin/status/route.ts`**
   - Status and health check endpoint
   - Shows current USDFC balance and SDK status
   - POST method for initializing payment setup

8. **`/web/app/api/filecoin/setup/route.ts`**
   - One-time setup endpoint
   - Configures payment settings for Filecoin storage

### UI Components

9. **`/web/components/AddExpenseForm.tsx`**
   - Uses Filecoin for receipt uploads in expense forms
   - Handles file selection and upload UI

10. **`/web/components/FilecoinStorage.tsx`**
    - Management UI for Filecoin storage
    - Shows storage stats and setup status

## Storage Process

### Upload Flow

1. User selects a receipt image in the UI
2. Client calls `/api/filecoin/upload` with the file
3. Server uploads the file using Synapse SDK
4. Storage is paid for by the company wallet
5. Piece CID is returned and saved with the expense

### Download Flow

1. Application requests receipt with piece CID
2. Server retrieves file from Filecoin via Synapse SDK
3. File is served to the client application

## Environment Variables

```
# Required
COMPANY_PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY_HERE
PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY_HERE

# Optional
NEXT_PUBLIC_FILECOIN_NETWORK=calibration
NEXT_PUBLIC_FILECOIN_RPC_HTTP=https://api.calibration.node.glif.io/rpc/v1
NEXT_PUBLIC_FILECOIN_RPC_WS=wss://api.calibration.node.glif.io/rpc/v1
```

## Setup Instructions

1. **Create Company Wallet**
   - Create a wallet for storage payments
   - Add Filecoin Calibration network
   - Get test tFIL from faucet

2. **Get USDFC Tokens**
   - USDFC is required for storage payments
   - Minimum 50 USDFC recommended

3. **Configure Environment**
   - Set `COMPANY_PRIVATE_KEY` in `.env.local`
   - Add other optional configurations

4. **Initialize Payments**
   - Run `curl -X POST http://localhost:3000/api/filecoin/status`
   - This approves storage service payments

## Testing

To test the Filecoin integration:

1. Check status: `curl http://localhost:3000/api/filecoin/status`
2. Upload a test file via the UI or API
3. Verify piece CID is returned
4. Download the file using the piece CID

## Troubleshooting

- **Balance shows 0**: The Synapse SDK may have issues with balance reporting. The application implements direct token contract queries as a fallback.
- **Upload timeouts**: The application implements multiple RPC fallbacks and timeout handling to improve reliability.
- **Network errors**: Ensure Filecoin Calibration network is accessible and RPC endpoints are working.

