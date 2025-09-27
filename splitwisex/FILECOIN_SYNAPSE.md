# Filecoin Integration with Synapse SDK

This document explains how the SplitwiseX application integrates with Filecoin blockchain storage using the Synapse SDK, focusing on the technical implementation and workflow.

## Synapse SDK Overview

[Synapse SDK](https://docs.filoz.dev/sdk/quickstart) is a developer toolkit that simplifies integration with the Filecoin network. In our application, we use it to provide:

1. **Company-paid storage** - Users don't need their own wallets or tokens
2. **Automated payments** - Handles USDFC token approvals and payments
3. **Simple file operations** - Abstracts complex blockchain operations

## Integration Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client-side   │     │   Server-side   │     │    Filecoin     │
│     NextJS      │────▶│   API Routes    │────▶│    Network      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       Upload               Synapse SDK           Decentralized
      Interface           Authentication          Data Storage
                          & Transactions
```

## Technical Implementation

### 1. Initialization & Authentication

```typescript
// From /web/lib/filecoin-receipt-storage.ts
async function getSynapseInstance() {
  if (!synapseInstance) {
    const companyPrivateKey = process.env.COMPANY_PRIVATE_KEY || process.env.PRIVATE_KEY
    
    synapseInstance = await Synapse.create({
      privateKey: companyPrivateKey,
      rpcURL: 'https://api.calibration.node.glif.io/rpc/v1'
    })
  }
  return synapseInstance
}
```

The SDK authenticates with the Filecoin network using the company's private key, establishing a connection to the Filecoin Calibration network.

### 2. Storage Service Setup

```typescript
// From /web/lib/filecoin-receipt-storage.ts
export async function setupPayments(): Promise<void> {
  const synapse = await getSynapseInstance()
  
  // Get Warm Storage address for service approval
  const warmStorageAddress = await synapse.getWarmStorageAddress()
  
  // Approve the service for automated payments
  const approveTx = await synapse.payments.approveService(
    warmStorageAddress,
    rateAllowance,      // Rate per epoch
    lockupAllowance,    // Total lockup
    maxLockupPeriod     // Duration
  )
  
  await approveTx.wait()
}
```

This one-time setup configures the payment arrangements between your company wallet and the Filecoin storage providers.

### 3. Receipt Upload Process

```typescript
// From /web/lib/filecoin-receipt-storage.ts
export async function uploadReceipt(receiptBuffer: Buffer, metadata = {}): Promise<ReceiptStorageResult> {
  const synapse = await getSynapseInstance()
  
  // Convert buffer to Uint8Array for Synapse SDK
  const fileData = new Uint8Array(receiptBuffer)
  
  // Store file on Filecoin
  const result = await synapse.storage.upload(fileData)
  
  return {
    success: true,
    pieceCid: result.pieceCid?.toString(),
    size: result.size
  }
}
```

The upload process converts the file buffer to a format compatible with the SDK, then uses the `storage.upload()` method to store it on Filecoin, returning a unique piece CID that serves as the storage identifier.

### 4. Receipt Retrieval Process

```typescript
// From /web/lib/filecoin-receipt-storage.ts
export async function downloadReceipt(pieceCid: string): Promise<{ success: boolean; data?: Buffer; error?: string }> {
  const synapse = await getSynapseInstance()
  const data = await synapse.storage.download(pieceCid)
  
  return {
    success: true,
    data: Buffer.from(data)
  }
}
```

Files are retrieved using the piece CID through the `storage.download()` method, converting the returned data to a Buffer for use in the application.

## "Company Pays" Model

Our implementation uses a company wallet to pay for all storage costs, providing free storage for users.

### Benefits

1. **No User Friction** - Users don't need cryptocurrency knowledge
2. **Predictable Costs** - Company controls storage budgets
3. **Simplified UX** - No wallet connections or token approvals

### How It Works

1. **Token Deposit** - Company loads USDFC tokens to wallet
2. **Service Approval** - Authorizes Filecoin to use tokens for storage
3. **Automatic Payments** - SDK handles all payment operations
4. **Rate Limiting** - Configurable spending limits protect against unexpected costs

### Configuration Parameters

```typescript
// Storage payment configuration
const rateAllowance = ethers.parseUnits('1', 18)     // 1 USDFC per epoch
const lockupAllowance = ethers.parseUnits('50', 18)  // 50 USDFC lockup
const maxLockupPeriod = BigInt(86400 * 30)           // 30 days
```

## API Integration

The Synapse SDK is wrapped in server-side API routes:

### Upload Endpoint

```typescript
// From /web/app/api/filecoin/upload/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  
  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  // Upload via Synapse SDK
  const result = await uploadReceipt(buffer, {
    fileName: file.name,
    fileType: file.type
  })
  
  return NextResponse.json({
    success: true,
    storageId: `filecoin:${result.pieceCid}`,
    pieceCid: result.pieceCid,
    // Additional metadata
  })
}
```

### Download Endpoint

```typescript
// From /web/app/api/filecoin/download/[pieceCid]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { pieceCid: string } }
) {
  const result = await downloadReceipt(params.pieceCid)
  
  // Set appropriate headers and return file
  return new Response(result.data, {
    headers: {
      'Content-Type': 'application/octet-stream'
    }
  })
}
```

## Frontend Integration

The file upload component connects to the API:

```typescript
// From /web/components/AddExpenseForm.tsx
async function onUpload(file: File) {
  try {
    const storageId = await uploadReceipt(file, expenseId)
    setReceiptStorageId(storageId)
    
  } catch (error) {
    console.error('Receipt upload failed:', error)
  }
}
```

## Balance Management & Monitoring

The SDK provides balance checking capabilities:

```typescript
export async function checkBalance(): Promise<string> {
  const synapse = await getSynapseInstance()
  const balance = await synapse.payments.balance()
  return ethers.formatUnits(balance, 18) // Convert to human-readable format
}
```

## Error Handling & Resilience

The implementation includes:

1. **Multiple RPC Fallbacks** - Attempts connections to different Filecoin endpoints
2. **Timeouts** - Prevents hanging on network issues
3. **Balance Verification** - Ensures sufficient funds before operations
4. **Detailed Error Reporting** - Provides specific error messages for troubleshooting

## Future Enhancements

Potential improvements for the Filecoin integration:

1. **Deal Status Monitoring** - Track storage deal states
2. **Retrieval Optimization** - Implement caching for frequently accessed files
3. **Storage Policy Controls** - Add admin controls for storage parameters
4. **Token Balance Alerts** - Notify when funds are low
5. **Multiple Network Support** - Add mainnet support when ready
