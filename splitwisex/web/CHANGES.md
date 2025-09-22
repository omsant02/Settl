# SplitwiseX Changes Documentation

This document outlines all the major changes and improvements made to the SplitwiseX codebase during development.

## 📁 Overview

SplitwiseX is a decentralized expense splitting application with IPFS and Filecoin integration for receipt storage. This document tracks all modifications made to transition from mock implementations to real Protocol Labs infrastructure.

## 🔄 Major Changes Summary

### 1. **IPFS & Filecoin Integration** (Real Implementation)
- **From**: Mock CID generation and placeholder storage
- **To**: Real IPFS uploads via Storacha CLI and Filecoin archival storage
- **Impact**: Receipts now stored on actual decentralized networks

### 2. **Authentication System** (Storacha Integration)
- **From**: API token-based authentication (deprecated)
- **To**: Email-based authentication with DID management
- **Impact**: Modern Protocol Labs authentication workflow

### 3. **Balance Display Enhancement** (UI/UX Improvement)
- **From**: Duplicate entries showing individual token amounts
- **To**: Consolidated USD-based balances with detailed modals
- **Impact**: Cleaner, more user-friendly balance management

### 4. **Expense Display Fix** (Critical Bug Fix)
- **From**: "No expenses yet" showing even after expense creation
- **To**: Proper expense listing with refresh mechanisms
- **Impact**: Core functionality now works correctly

### 5. **Component Cleanup** (Code Optimization)
- **From**: Complex encryption components and unused files
- **To**: Simplified, reliable upload system
- **Impact**: Reduced complexity, improved maintainability

---

## 📋 Detailed Changes by Category

### 🌐 **IPFS & Storage Changes**

#### Files Modified:
- `lib/ipfs.ts` - Complete rewrite for real IPFS integration
- `app/api/upload-storacha/route.ts` - New API endpoint for Storacha uploads
- `app/api/pin/route.ts` - New API endpoint for Filecoin deals
- `.env.local` - Updated with Storacha credentials

#### Key Changes:
```typescript
// OLD: Mock CID generation
const cid = `bafkreih${hashHex.substring(0, 52)}`

// NEW: Real IPFS upload via Storacha
const response = await fetch('/api/upload-storacha', {
  method: 'POST',
  body: formData,
})
const result = await response.json()
return result.cid
```

#### Environment Variables Added:
```env
NEXT_PUBLIC_STORACHA_EMAIL=abhinavkale919913@gmail.com
NEXT_PUBLIC_STORACHA_DID=did:key:z6Mknznau6Mg7yvoexyRaunoi4b1AAeJzZgXj3nQmievqpEn
```

### 🔐 **Authentication Changes**

#### Storacha CLI Setup:
```bash
# NEW: Storacha CLI authentication
npm install -g @storacha/cli
npx @storacha/cli login abhinavkale919913@gmail.com
npx @storacha/cli space use did:key:z6MkqbfNzDJCN7XQXgRqtq1WSyJ9KdwSjZrKQMmTNGWGz5CJ
```

#### Dependencies Added:
```json
{
  "@storacha/client": "^1.5.1",
  "@storacha/cli": "^1.5.1"
}
```

### 💰 **Balance System Overhaul**

#### File Modified: `components/Balances.tsx`

#### Key Changes:
```typescript
// OLD: Individual debt entries
{myDebts.map((debt) => (
  <div key={debt.id}>
    <span>{formatTokenAmount(debt.amount, debt.token)}</span>
  </div>
))}

// NEW: Consolidated USD balances with modal
{myDebtBalances.map((member) => (
  <div onClick={() => openMemberModal(member, 'owing')}>
    <span>${member.totalUSD.toLocaleString()}</span>
  </div>
))}
```

#### Features Added:
- **Consolidated balances** by member (no duplicates)
- **USD conversion** for all token types
- **Interactive modals** showing ETH and USDC breakdowns
- **Click-to-view details** functionality

### 🐛 **Expense Display Fix**

#### Files Modified:
- `lib/queries.ts` - Fixed subgraph queries
- `app/group/[name]/page.tsx` - Added debugging and refresh mechanisms
- `components/AddExpenseForm.tsx` - Improved expense ID extraction

#### Query Fix:
```graphql
# OLD: Missing debtors field
{ expenses(where: { group: "${groupId}" }) {
    id payer { id } token amount cid memo createdAt
} }

# NEW: Complete expense data
{ expenses(where: { group: "${groupId}" }) {
    id payer { id } token amount cid memo createdAt
    debtors { id amount }
    group { id }
} }
```

#### Debug Tools Added:
- **Console logging** for expense data debugging
- **Manual refresh button** for forcing data updates
- **Direct subgraph test** button for query verification

### 🧹 **Code Cleanup & Optimization**

#### Files Removed:
- `lib/encryption.ts` - Complex encryption functionality
- `lib/secureStorage.ts` - Secure storage utilities
- `lib/synapse.ts` - Synapse SDK wrapper
- `components/EncryptedReceiptViewer.tsx` - Encryption-based receipt viewer
- `ENCRYPTION_FILECOIN_README.md` - Outdated documentation

#### Files Simplified:
- `components/AddExpenseForm.tsx` - Removed encryption complexity
- `app/group/[name]/page.tsx` - Simplified receipt display
- `app/settings/did/page.tsx` - Updated to use environment variables

### 🔧 **Bug Fixes & Improvements**

#### Transaction Log Parsing Fix:
```typescript
// OLD: Incorrect topic index
if (log.topics[1]) {
  expenseId = parseInt(log.topics[1], 16)
}

// NEW: Correct topic index for ExpenseAdded event
if (log.topics[2]) {
  expenseId = parseInt(log.topics[2], 16)
}
```

#### TypeScript Fixes:
```typescript
// Fixed parameter typing
console.warn(receipt.logs.map((log: any, i: number) =>
  ({ index: i, topics: log.topics, data: log.data })
))
```

#### Null Safety Improvements:
```typescript
// OLD: Potential null pointer
const name = decodeURIComponent(params.name)

// NEW: Null-safe access
const name = params?.name ? decodeURIComponent(params.name) : ''
```

---

## 📚 **New Documentation**

### Files Created:
1. **`IPFS_SETUP.md`** - Complete setup guide for IPFS/Filecoin integration
2. **`CHANGES.md`** - This documentation file

### Documentation Includes:
- **Step-by-step setup** instructions
- **CLI commands** for Storacha authentication
- **Troubleshooting guide** for common issues
- **Architecture overview** of storage flow
- **API endpoint documentation**

---

## 🎯 **Current State**

### ✅ **Working Features:**
- **Real IPFS uploads** via Storacha CLI
- **Filecoin deal creation** for permanent storage
- **Consolidated balance display** with USD conversion
- **Interactive member modals** with detailed breakdowns
- **Expense creation and display** with proper subgraph integration
- **Debug tools** for troubleshooting

### 🚀 **Architecture:**
```
Frontend (Next.js)
    ↓
IPFS Upload (Storacha CLI)
    ↓
Blockchain Transaction (Smart Contract)
    ↓
Filecoin Deal (Protocol Labs)
    ↓
Subgraph Indexing (The Graph)
    ↓
UI Update (Real-time)
```

### 🔗 **Integration Points:**
- **Storacha**: Real IPFS uploads and authentication
- **Protocol Labs**: Filecoin permanent storage
- **The Graph**: Blockchain data indexing
- **MetaMask**: Wallet integration for transactions
- **Smart Contracts**: On-chain expense and debt management

---

## 📦 **Package Dependencies**

### Added:
```json
{
  "@storacha/client": "^1.5.1"
}
```

### Global Installs:
```bash
npm install -g @storacha/cli
```

### Environment Setup:
```env
NEXT_PUBLIC_STORACHA_EMAIL=abhinavkale919913@gmail.com
NEXT_PUBLIC_STORACHA_DID=did:key:z6Mknznau6Mg7yvoexyRaunoi4b1AAeJzZgXj3nQmievqpEn
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/121313/ethglobal-2/v1.0.0
NEXT_PUBLIC_LEDGER_ADDRESS=0x26c1450c8f5B5769577c564372522644168e1224
```

---

## 🔄 **Migration Guide**

If someone needs to understand or continue this codebase:

### 1. **Setup Environment:**
```bash
# Install dependencies
npm install

# Install Storacha CLI
npm install -g @storacha/cli

# Authenticate with Storacha
npx @storacha/cli login your-email@example.com
```

### 2. **Configure Environment:**
```bash
# Copy environment template
cp .env.local.example .env.local

# Update with your credentials
NEXT_PUBLIC_STORACHA_EMAIL=your-email@example.com
NEXT_PUBLIC_STORACHA_DID=your-did-from-cli
```

### 3. **Test Integration:**
```bash
# Test CLI upload
echo "test" > test.txt
npx @storacha/cli up test.txt

# Run development server
npm run dev
```

### 4. **Verify Functionality:**
- Create a group
- Add an expense with receipt
- Check console logs for IPFS CID
- Verify receipt appears in expense list
- Test balance calculations and modal interactions

---

## 📞 **Support & Context**

This codebase implements a **fully decentralized expense splitting application** with:

- **Real IPFS storage** (not mocked)
- **Filecoin archival** (permanent storage)
- **Blockchain integration** (smart contracts)
- **Modern UI/UX** (consolidated balances, interactive modals)
- **Debug tools** (refresh buttons, subgraph testing)

For any questions or to continue development, refer to:
1. **`IPFS_SETUP.md`** - Setup instructions
2. **`CHANGES.md`** - This change log
3. **Console logs** - Debug information
4. **UI debug buttons** - Testing tools

The application is production-ready with real decentralized storage integration via Protocol Labs infrastructure.