import { uploadReceiptToFilecoin, getFilecoinGatewayUrl } from './filecoin-storage'

export async function uploadReceipt(file: File, walletClient?: any, expenseId?: string): Promise<string> {
  console.log('🚀 Uploading receipt to Filecoin via company wallet:', file.name, file.size, 'bytes');

  // Only server-side Filecoin upload - no fallbacks
  console.log('📤 Uploading via Synapse SDK server-side integration...');

  const formData = new FormData()
  formData.append('file', file)
  if (expenseId) formData.append('expenseId', expenseId)

  const response = await fetch('/api/filecoin/upload', {
    method: 'POST',
    body: formData
  })

  const result = await response.json()

  if (response.ok && result.success) {
    console.log('✅ Receipt successfully uploaded to Filecoin:', result);
    return result.storageId // Returns "filecoin:pieceCid"
  } else {
    console.error('❌ Filecoin upload failed:', result.error);
    throw new Error(`Filecoin upload failed: ${result.error || 'Unknown error'}`)
  }
}

// Only Filecoin uploads - no fallbacks or alternative methods

/**
 * Get gateway URL for Filecoin storage only
 * @param cid The Filecoin storage identifier (filecoin:pieceCid)
 * @returns string Gateway URL
 */
export const ipfsGateway = (cid: string) => {
  console.log('🔗 Getting gateway URL for Filecoin storage:', cid)

  // Only handle Filecoin storage - no fallbacks
  if (cid.startsWith('filecoin:')) {
    const [, pieceCid] = cid.split(':')
    const url = getFilecoinGatewayUrl(pieceCid)
    console.log('✅ Returning Filecoin gateway URL:', url)
    return url
  }

  // If not Filecoin format, throw error
  throw new Error(`Invalid storage format: ${cid}. Only Filecoin storage supported.`)
}

/**
 * Alternative gateway options
 */
export const ipfsGateways = {
  ipfs: (cid: string) => `https://ipfs.io/ipfs/${cid}`,
  cloudflare: (cid: string) => `https://cloudflare-ipfs.com/ipfs/${cid}`,
  dweb: (cid: string) => `https://dweb.link/ipfs/${cid}`,
};

/**
 * Create Filecoin deal for receipt using Synapse SDK
 * @param expenseId The expense ID
 * @param cid The IPFS CID
 * @param payerAddress The address of the person who paid
 * @returns Promise<{dealId: string, jobId: string}> The deal information
 */
export async function createFilecoinDeal(
  expenseId: number,
  cid: string,
  payerAddress: string
): Promise<{dealId: string, jobId: string, txHash?: string}> {
  try {
    const response = await fetch('/api/pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expenseId,
        cid,
        payerAddress,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Filecoin deal: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      dealId: result.dealId,
      jobId: result.job?.id || result.jobId,
      txHash: result.txHash,
    };
  } catch (error) {
    console.error('Filecoin deal creation error:', error);
    throw error;
  }
}


