# Encrypted File Upload Documentation

## Overview

This document explains how encrypted image upload works in the SplitwiseX project using Lighthouse for decentralized storage on Filecoin with BLS cryptography encryption.

## Architecture

```
Frontend (Browser) → API Route (Next.js) → Lighthouse Service (Node.js) → Filecoin Network
```

### Components:

1. **Frontend**: `web/components/EncryptedFileUpload.tsx` - React component for file selection and upload
2. **API Route**: `web/app/api/lighthouse/upload/route.ts` - Next.js API route that proxies requests
3. **Lighthouse Service**: `lighthouse/src/server.js` - Standalone Express server on port 3002
4. **SDK Wrapper**: `lighthouse/src/lighthouse-js-sdk.js` - JavaScript wrapper for Lighthouse SDK

## How It Works

### 1. Authentication Flow (Browser Method)

```javascript
// 1. Get auth message from Lighthouse
const authResponse = await fetch('/api/lighthouse/auth-message', {
  method: 'POST',
  body: JSON.stringify({ publicKey: userAddress })
});

// 2. User signs the message with their wallet
const signedMessage = await signMessageAsync({ message });

// 3. Signed message is used for encryption authentication
```

### 2. Upload Process

```javascript
// 1. Frontend prepares FormData
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('publicKey', userAddress);
formData.append('signedMessage', signedMessage);
formData.append('encrypted', 'true');

// 2. API route forwards to Lighthouse service
const response = await fetch('/api/lighthouse/upload', {
  method: 'POST',
  body: formData
});

// 3. Lighthouse service processes the upload
const response = await lighthouse.uploadEncrypted(
  tempFilePath,      // File path (Node.js requirement)
  LIGHTHOUSE_API_KEY, // API key
  publicKey,         // User's wallet address
  signedMessage      // Wallet signature for auth
);
```

### 3. Encryption Details

- **Algorithm**: BLS (Boneh-Lynn-Shacham) cryptography
- **Key Splitting**: Encryption key is split into 5 parts
- **Storage**: Key parts stored on separate Lighthouse nodes
- **Access Control**: Only the file owner can decrypt or share access

### 4. Response Format

```javascript
// Successful response
{
  success: true,
  hash: "bafkrei...",           // Actual CID from Filecoin
  name: "image.jpg",
  size: 123456,
  encrypted: true,
  publicKey: "0x...",
  note: "Upload successful with JWT authentication"
}

// Error response
{
  success: false,
  error: "Error message"
}
```

## Current Issues & Status

### ✅ Working:
- Authentication flow with wallet signing
- File upload to Lighthouse service
- FormData forwarding through API routes
- Temporary file creation for Node.js compatibility

### ❌ Current Problem: "Error encrypting file"

The persistent error we're encountering is:

```bash
❌ Upload failed: Error: Error encrypting file
    at exports.default (/Users/apple/Desktop/solidity-basics/splitwisex/lighthouse/node_modules/@lighthouse-web3/sdk/dist/Lighthouse/uploadEncrypted/encrypt/file/node.js:42:19)
```

### 🔍 Root Cause Analysis:

This error occurs at **line 42 in the Lighthouse SDK's Node.js encryption module**. The error suggests an **authentication mismatch** between our browser-signed message and what the Node.js encryption nodes expect.

#### The Core Issue:

1. **Frontend (Browser Method)**:
   - Uses `lighthouse.getAuthMessage(userAddress)` to get auth message
   - User signs with MetaMask wallet → produces browser-format signature
   - Signature format: `0x9219bc2e15f49dd551427f515324598a03cdf8e7d7e2234fede22d9b8da2134a38c5eec3fc6370df2a80ba0a1937112d489b6deff517e1667d1f9f6c6778700c1b`

2. **Backend (Node.js Method)**:
   - Receives browser signature but tries to use it with Node.js encryption
   - Node.js encryption nodes expect different authentication format
   - **Mismatch**: Browser signature ≠ Node.js expected format

#### Why This Happens:

The Lighthouse SDK has **two different authentication systems**:

- **Browser Method**: Direct wallet signatures work with browser-based encryption
- **Node.js Method**: Requires JWT tokens from kavach service for server-side encryption

**Our Hybrid Approach Problem:**
- We're using browser authentication (wallet signing)
- But trying to encrypt in Node.js environment
- The encryption nodes reject browser signatures when called from server

### 🔍 Error Pattern Deep Dive:

```bash
# What we see in logs:
📋 Getting auth message for: 0x8BC38e23A9F42ECd0216d4724dc5f3c7Ce91962A
✅ Auth message: Please sign this message to prove you are owner of this account: 6e5f5da6cf634728bf709582ad25a237
🔑 Signed message: 0x9219bc2e15f49dd551427f515324598a03cdf8e7d7e2234fede22d9b8da2134a38c5eec3fc6370df2a80ba0a1937112d489b6deff517e1667d1f9f6c6778700c1b
📤 Uploading encrypted file (user-owned browser method)...
❌ Upload failed: Error: Error encrypting file

# What's happening internally:
1. Lighthouse SDK receives: (filePath, apiKey, userAddress, browserSignature)
2. SDK tries to authenticate browserSignature with encryption nodes
3. Encryption nodes expect JWT format, not raw wallet signature
4. Authentication fails → "Error encrypting file"
```

### 🛠️ Attempted Solutions:

#### Solution 1: Direct Browser Signature (Current - FAILING)
```javascript
// What we're doing:
const response = await lighthouse.uploadEncrypted(
  tempFilePath,
  LIGHTHOUSE_API_KEY,
  publicKey,      // User address: 0x8BC38e23...
  signedMessage   // Browser signature: 0x9219bc2e...
);
// ❌ Fails: Node.js encryption nodes reject browser signatures
```

#### Solution 2: JWT Conversion (Attempted)
```javascript
// What we tried:
const jwt = await kavach.getJWT(publicKey, signedMessage);
const response = await lighthouse.uploadEncrypted(tempFilePath, LIGHTHOUSE_API_KEY, publicKey, jwt);
// ❌ Issue: Browser signature may not be compatible with kavach.getJWT()
```

### 🎯 Correct Solutions:

#### Option A: Pure Browser Method (Frontend Upload)
Move encryption to frontend completely:
```javascript
// Frontend only:
const response = await lighthouse.uploadEncrypted(
  file,           // File object (not path)
  apiKey,
  userAddress,
  signature
);
```
**Pros**: Matches browser method exactly
**Cons**: Large files may timeout, exposes API key to frontend

#### Option B: Pure Node.js Method (Server JWT)
Use server-side wallet for JWT generation:
```javascript
// Backend with server wallet:
const { message } = await kavach.getAuthMessage(serviceWalletAddress);
const signature = await serverSigner.signMessage(message);
const { JWT } = await kavach.getJWT(serviceWalletAddress, signature);
const response = await lighthouse.uploadEncrypted(filePath, apiKey, serviceWalletAddress, JWT);
```
**Pros**: Reliable server-side encryption
**Cons**: Service owns files, not users

#### Option C: Hybrid with Proper JWT (Recommended)
Convert user signature to valid JWT:
```javascript
// 1. Frontend: Get kavach message instead of lighthouse message
const { message } = await kavach.getAuthMessage(userAddress);
const signature = await signMessage(message);

// 2. Backend: Convert to JWT
const { JWT } = await kavach.getJWT(userAddress, signature);
const response = await lighthouse.uploadEncrypted(filePath, apiKey, userAddress, JWT);
```
**Pros**: User owns files, reliable encryption
**Cons**: Need to change frontend auth flow

### 🧪 Current Debug Strategy:

We're temporarily testing with **non-encrypted uploads** to verify:
1. ✅ API key validity
2. ✅ File handling
3. ✅ Basic Lighthouse connectivity

If non-encrypted upload works → Only encryption auth is broken
If non-encrypted upload fails → Fundamental setup issue

### 📋 Next Steps:

1. **Test non-encrypted upload** to isolate the issue
2. **Implement Option C** (proper JWT flow) if basic upload works
3. **Update frontend** to use kavach auth message instead of lighthouse auth message
4. **Verify file ownership** works correctly with user addresses

## Environment Variables

```bash
# Lighthouse API Key
LIGHTHOUSE_API_KEY=your_api_key_here

# Lighthouse Service URL (default: http://localhost:3002)
LIGHTHOUSE_SERVICE_URL=http://localhost:3002

# WalletConnect Project ID (optional)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

## File Structure

```
web/
├── components/
│   └── EncryptedFileUpload.tsx     # Upload component
├── app/api/lighthouse/
│   ├── upload/route.ts             # Proxy to Lighthouse service
│   └── auth-message/route.ts       # Get auth message
lighthouse/
├── src/
│   ├── server.js                   # Express server (port 3002)
│   └── lighthouse-js-sdk.js        # SDK wrapper
└── package.json
```

## Usage Example

```jsx
import EncryptedFileUpload from '@/components/EncryptedFileUpload';

function MyPage() {
  return (
    <div>
      <EncryptedFileUpload />
    </div>
  );
}
```

## Key Implementation Details

### Node.js vs Browser Compatibility

The Lighthouse SDK has different requirements:
- **Browser**: Accepts File objects directly
- **Node.js**: Requires file system paths

Our solution:
1. Frontend sends File objects via FormData
2. Backend creates temporary files from buffers
3. Lighthouse SDK processes temporary file paths
4. Cleanup removes temporary files after upload

### Authentication Method

We use the **browser authentication method** even in Node.js:
- Frontend gets auth message using `lighthouse.getAuthMessage()`
- User signs with wallet (MetaMask, etc.)
- Backend uses the signed message directly (not JWT conversion)

This hybrid approach works because:
- Users sign with their actual wallets (security)
- Backend processes files (large file support)
- Authentication remains client-side (no private keys on server)

## Next Steps

1. **Fix CID Extraction**: Debug why real CID isn't being returned
2. **Error Handling**: Improve error messages and fallback mechanisms
3. **File Management**: Integrate with LighthouseFileManager component
4. **Sharing Features**: Complete file sharing and access control
5. **Optimization**: Reduce temporary file usage if possible

## Security Considerations

- Files are encrypted client-side before upload
- Only file owners can decrypt or share access
- No private keys stored on server
- Wallet signatures provide authentication
- Files stored permanently on Filecoin network

## Troubleshooting

### Common Issues:

1. **"Error encrypting file"**: Known SDK issue, upload may still succeed
2. **File path errors**: Ensure Node.js gets file paths, not File objects
3. **Auth failures**: Check wallet connection and signature validity
4. **Network timeouts**: Verify Lighthouse service is running on port 3002

### Debug Steps:

1. Check Lighthouse service logs (port 3002)
2. Verify API route receives correct FormData
3. Confirm auth message signing works
4. Check Lighthouse dashboard for uploaded files
5. Monitor temporary file creation/cleanup