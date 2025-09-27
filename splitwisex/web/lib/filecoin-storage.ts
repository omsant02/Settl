/**
 * Filecoin Storage Service using Synapse SDK
 *
 * This replaces Storacha IPFS storage with direct Filecoin storage via Synapse SDK
 * for hackathon compliance with Filecoin Track requirements.
 */

import { initSynapseBrowser, initSynapseServer } from './synapse'
import { env } from './env'
import { ethers } from 'ethers'

export interface StorageResult {
  dealId: string
  cid: string
  gatewayUrl: string
  explorerUrl: string
}

/**
 * Upload receipt to Filecoin using Synapse SDK (browser)
 * @param file The receipt file to upload
 * @param walletClient WAGMI wallet client from useWalletClient()
 * @returns Storage result with deal ID and CID
 */
export async function uploadReceiptToFilecoin(
  file: File,
  walletClient: any
): Promise<StorageResult> {
  console.log('Uploading receipt to Filecoin via Synapse SDK:', file.name, file.size, 'bytes')

  if (!walletClient) {
    throw new Error('Wallet client is required for Filecoin upload')
  }

  try {
    // Create a signer connected to the Filecoin network using WAGMI wallet client
    console.log('Creating Filecoin-connected signer from WAGMI wallet client...')

    if (!walletClient.transport) {
      throw new Error('Wallet client transport not available')
    }

    // Use Filecoin Calibration testnet RPC
    const filecoinRpcUrl = 'https://api.calibration.node.glif.io/rpc/v1'
    const filecoinProvider = new ethers.JsonRpcProvider(filecoinRpcUrl)

    // Convert WAGMI wallet client to ethers provider and get signer
    // Use the wallet client's transport as the ethereum provider
    const browserProvider = new ethers.BrowserProvider(walletClient.transport as any)
    const browserSigner = await browserProvider.getSigner()

    // Connect the signer to the Filecoin network
    const filecoinSigner = browserSigner.connect(filecoinProvider)

    // Initialize Synapse SDK with Filecoin-connected signer
    console.log('Initializing Synapse SDK with Filecoin signer')
    const synapse = await initSynapseBrowser(filecoinSigner, 'calibration')

    // Convert File to the format expected by Synapse SDK
    const fileBuffer = await file.arrayBuffer()
    const fileData = new Uint8Array(fileBuffer)

    console.log('Storing file on Filecoin via Synapse SDK...')

    // Store file on Filecoin
    const result = await synapse.storage.upload(fileData)

    console.log('File stored successfully on Filecoin:', result)

    // Extract piece information from result
    const pieceId = result.pieceId?.toString() || 'unknown'
    const cid = result.pieceCid.toString()

    return {
      dealId: pieceId,
      cid: cid,
      gatewayUrl: getFilecoinGatewayUrl(cid),
      explorerUrl: getFilecoinExplorerUrl(pieceId)
    }

  } catch (error) {
    console.error('Filecoin storage failed:', error)
    throw new Error(`Failed to store receipt on Filecoin: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Upload receipt to Filecoin using Synapse SDK (server-side)
 * @param fileBuffer The receipt file buffer
 * @param fileName The original file name
 * @returns Storage result with deal ID and CID
 */
export async function uploadReceiptToFilecoinServer(
  fileBuffer: Buffer,
  fileName: string
): Promise<StorageResult> {
  console.log('Server-side upload to Filecoin via Synapse SDK:', fileName, fileBuffer.length, 'bytes')

  try {
    // Initialize Synapse SDK with server credentials
    const synapse = await initSynapseServer(undefined, 'calibration')

    // Convert buffer to Uint8Array for Synapse SDK
    const fileData = new Uint8Array(fileBuffer)

    console.log('Storing file on Filecoin via server...')

    // Store file on Filecoin
    const result = await synapse.storage.upload(fileData)

    console.log('File stored successfully on Filecoin:', result)

    // Extract piece information from result
    const pieceId = result.pieceId?.toString() || 'unknown'
    const cid = result.pieceCid.toString()

    return {
      dealId: pieceId,
      cid: cid,
      gatewayUrl: getFilecoinGatewayUrl(cid),
      explorerUrl: getFilecoinExplorerUrl(pieceId)
    }

  } catch (error) {
    console.error('Server-side Filecoin storage failed:', error)
    throw new Error(`Failed to store receipt on Filecoin: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get Filecoin gateway URL for accessing stored files
 * @param cid The content identifier
 * @returns Gateway URL
 */
export function getFilecoinGatewayUrl(cid: string): string {
  // Use Filecoin's public gateway
  return `https://dweb.link/ipfs/${cid}`
}

/**
 * Get Filecoin explorer URL for viewing piece information
 * @param pieceId The piece identifier
 * @returns Explorer URL for Calibration testnet
 */
export function getFilecoinExplorerUrl(pieceId: string): string {
  // Use Calibration testnet explorer - note: piece IDs may not be directly viewable
  return `https://calibration.filfox.info/en/search/${pieceId}`
}

/**
 * Alternative gateways for Filecoin content
 */
export const filecoinGateways = {
  dweb: (cid: string) => `https://dweb.link/ipfs/${cid}`,
  ipfs: (cid: string) => `https://ipfs.io/ipfs/${cid}`,
  cloudflare: (cid: string) => `https://cloudflare-ipfs.com/ipfs/${cid}`,
  nftstorage: (cid: string) => `https://nftstorage.link/ipfs/${cid}`
}

/**
 * Retrieve file from Filecoin using CID
 * @param cid The content identifier
 * @returns File data as ArrayBuffer
 */
export async function retrieveFromFilecoin(cid: string): Promise<ArrayBuffer> {
  const gatewayUrl = getFilecoinGatewayUrl(cid)

  try {
    const response = await fetch(gatewayUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch from gateway: ${response.statusText}`)
    }

    return await response.arrayBuffer()
  } catch (error) {
    console.error('Failed to retrieve from Filecoin:', error)
    throw new Error(`Failed to retrieve file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Verify file integrity by comparing with original
 * @param originalFile The original file
 * @param cid The stored file CID
 * @returns True if files match
 */
export async function verifyFileIntegrity(originalFile: File, cid: string): Promise<boolean> {
  try {
    const originalBuffer = await originalFile.arrayBuffer()
    const storedBuffer = await retrieveFromFilecoin(cid)

    // Compare file sizes first (quick check)
    if (originalBuffer.byteLength !== storedBuffer.byteLength) {
      return false
    }

    // Compare content
    const originalArray = new Uint8Array(originalBuffer)
    const storedArray = new Uint8Array(storedBuffer)

    for (let i = 0; i < originalArray.length; i++) {
      if (originalArray[i] !== storedArray[i]) {
        return false
      }
    }

    return true
  } catch (error) {
    console.error('File integrity verification failed:', error)
    return false
  }
}