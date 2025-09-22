/**
 * Web3Storage Integration with DID Authentication
 * 
 * This module provides utilities for interacting with web3.storage using DID-based authentication.
 * Uses the official w3up client libraries for real-world implementation.
 */

import * as Client from '@web3-storage/w3up-client'

// Store the client instance for reuse
let client: any = null

// Store the space for reuse
let currentSpace: any = null

// Store the DID for the current space
let currentDID: string | null = null

interface UploadResult {
  cid: string
  size: number
}

interface StorageStatus {
  cid: string
  status: 'uploading' | 'uploaded' | 'failed'
  error?: string
}

/**
 * Authenticate with web3.storage using a DID
 * @param did The DID to use for authentication
 * @returns A boolean indicating whether authentication was successful
 */
export async function authenticateWithDID(did: string): Promise<boolean> {
  if (!did.startsWith('did:')) {
    throw new Error('Invalid DID format. Must start with "did:"')
  }
  
  try {
    console.log(`Authenticating with DID: ${did}`)
    
    // Create a new client if we don't have one
    if (!client) {
      client = await Client.create()
    }
    
    // Create a new space if we don't have one or if the DID has changed
    if (!currentSpace || currentDID !== did) {
      currentSpace = await client.createSpace(did)
      await client.setCurrentSpace(currentSpace.did())
      currentDID = did
    }
    
    return true
  } catch (error) {
    console.error('Authentication failed:', error)
    return false
  }
}

/**
 * Upload a file to web3.storage using DID authentication
 * @param file The file to upload
 * @param did The DID to use for authentication
 * @param onProgress Optional callback for upload progress updates
 * @returns The CID of the uploaded file
 */
export async function uploadFileWithDID(
  file: File,
  did: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // First authenticate with the DID
  const isAuthenticated = await authenticateWithDID(did)
  if (!isAuthenticated) {
    throw new Error('Authentication failed')
  }
  
  if (!currentSpace || !client) {
    throw new Error('Space not initialized')
  }
  
  console.log(`Uploading file ${file.name} (${file.size} bytes) using DID: ${did}`)
  
  try {
    // Report initial progress
    if (onProgress) {
      onProgress(0.1)
    }
    
    // Upload the file using the client
    const uploadable = await client.uploadFile(file)
    
    // Report completion
    if (onProgress) {
      onProgress(1)
    }
    
    return {
      cid: uploadable.toString(),
      size: file.size
    }
  } catch (error) {
    console.error('Upload failed:', error)
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Check the status of a file on web3.storage
 * @param cid The CID of the file to check
 * @param did The DID used for authentication
 * @returns The status of the file
 */
export async function checkFileStatus(cid: string, did: string): Promise<StorageStatus> {
  // First authenticate with the DID
  const isAuthenticated = await authenticateWithDID(did)
  if (!isAuthenticated) {
    throw new Error('Authentication failed')
  }
  
  if (!currentSpace || !client) {
    throw new Error('Space not initialized')
  }
  
  console.log(`Checking status of file with CID: ${cid}`)
  
  try {
    // Check if the CID exists in the space
    const uploadList = await client.capability.store.list()
    const found = uploadList.some((upload: any) => upload.root.toString() === cid)
    
    return {
      cid,
      status: found ? 'uploaded' : 'failed'
    }
  } catch (error) {
    console.error('Status check failed:', error)
    return {
      cid,
      status: 'failed',
      error: `Status check failed: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * Get the IPFS gateway URL for a CID
 * @param cid The CID to get the gateway URL for
 * @returns The gateway URL
 */
export function getIPFSGatewayURL(cid: string): string {
  // Import here to avoid circular dependencies
  const { env } = require('./env')
  return `${env.IPFS_GATEWAY}/${cid}`
}

/**
 * Validate a DID string
 * @param did The DID to validate
 * @returns Whether the DID is valid
 */
export function isValidDID(did: string): boolean {
  // Basic validation - must start with did: and have a method and id
  const didRegex = /^did:[a-z0-9]+:[a-zA-Z0-9.%-]+$/
  return didRegex.test(did)
}

/**
 * Generate CLI commands for w3cli tool
 * @param email User's email
 * @param did User's DID
 * @returns Object containing CLI commands
 */
export function getW3CLICommands(email: string, did: string): { register: string, upload: string } {
  return {
    register: `w3 space register ${email}`,
    upload: `w3 up ./path/to/files`
  }
}
