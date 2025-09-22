# Storacha (web3.storage) Setup Guide

## Your Current Setup
- **Plan**: Starter (5.0GB storage)
- **Usage**: 0B of 5.0GB
- **DID**: `did:key:z6MkkdKAhVRGgNKSsoDLx51eNxfnTsXnwKnpPKTaHXtDdJAZ`
- **Referral Link**: http://storacha.network/referred?refcode=cfGPPnfwp8qhqhCP

## Quick Setup

### 1. Get Your API Token
1. Go to [Storacha Console](https://console.storacha.network/)
2. Sign in to your account
3. Navigate to "API Tokens" or "Settings"
4. Create a new API token or copy your existing token
5. Copy the token value

### 2. Configure Environment Variables

Create a `.env` file in the `/web` folder:

```bash
# Copy from .env.example
cp .env.example .env
```

Edit the `.env` file and add your token:

```env
# Storacha (web3.storage) API Token
NEXT_PUBLIC_WEB3STORAGE_TOKEN=your_actual_token_here

# Your Storacha DID (Agent) - Optional
NEXT_PUBLIC_STORACHA_DID=did:key:z6MkkdKAhVRGgNKSsoDLx51eNxfnTsXnwKnpPKTaHXtDdJAZ
```

### 3. Test Upload

The upload function is already configured in `/lib/ipfs.ts`. When you upload a receipt through the app:

1. File gets uploaded to Storacha IPFS
2. Returns a CID (Content Identifier)
3. File is accessible via: `https://w3s.link/ipfs/{cid}`

## Storage Limits

- **Starter Plan**: 5.0GB total storage
- **Current Usage**: 0B (plenty of space for receipts!)
- **Receipt Size**: Typically 50KB-500KB per image

With 5GB, you can store approximately **10,000-100,000 receipts** 📸

## Integration Points

### Frontend Upload
```typescript
import { uploadReceipt } from '@/lib/ipfs';

const cid = await uploadReceipt(file);
console.log('Uploaded to IPFS:', cid);
```

### View Receipt
```typescript
import { ipfsGateway } from '@/lib/ipfs';

const url = ipfsGateway(cid);
// Opens: https://w3s.link/ipfs/{cid}
```

### Filecoin Integration
After IPFS upload, the receipt CID is sent to Filecoin via Synapse SDK for long-term storage durability.

## Troubleshooting

### Common Issues

1. **"Token not configured" error**
   - Make sure `.env` file exists in `/web` folder
   - Verify token starts with `NEXT_PUBLIC_WEB3STORAGE_TOKEN=`

2. **Upload fails with 401 Unauthorized**
   - Token is invalid or expired
   - Get a fresh token from Storacha console

3. **Upload fails with 403 Forbidden**
   - Storage quota exceeded (check usage on console)
   - Upgrade plan if needed

4. **CORS errors**
   - This shouldn't happen with Storacha's API
   - Check that you're using the correct endpoint

### Debug Upload
Enable detailed logging by checking browser console:
```javascript
// The upload function logs success/error details
console.log('Storacha upload successful:', result);
```

## Upgrade Options

If you need more storage:
- **Lite Plan**: More storage + features
- **Business Plan**: Enterprise features
- **Use referral link** to earn free storage: http://storacha.network/referred?refcode=cfGPPnfwp8qhqhCP

## Security Notes

- ✅ Token is in environment variables (not committed to Git)
- ✅ Uploads are public on IPFS (expected for receipts)
- ✅ CIDs are deterministic (same file = same CID)
- ⚠️ Don't upload sensitive data without encryption

## Next Steps

1. Set up your API token
2. Test receipt upload in the app
3. Configure Synapse SDK for Filecoin deals
4. Deploy ReceiptRegistry contract
5. Deploy subgraph for indexing

Your Storacha integration is ready! 🚀