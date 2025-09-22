/**
 * Synapse SDK Integration for Filecoin Storage
 * 
 * This module provides utilities for interacting with the Synapse SDK to store files on Filecoin.
 * It uses wallet authentication (MetaMask in browser, private key on server) instead of API keys.
 */

import { Synapse } from '@filoz/synapse-sdk'
import { env } from './env'

// Export the RPC URLs using environment variables
export const RPC_URLS = {
  mainnet: {
    http: env.FILECOIN_NETWORK === 'mainnet' ? env.FILECOIN_RPC_HTTP : 'https://api.node.glif.io/rpc/v1',
    websocket: env.FILECOIN_NETWORK === 'mainnet' ? env.FILECOIN_RPC_WS : 'wss://api.node.glif.io/rpc/v1'
  },
  calibration: {
    http: env.FILECOIN_NETWORK === 'calibration' ? env.FILECOIN_RPC_HTTP : 'https://api.calibration.node.glif.io/rpc/v1',
    websocket: env.FILECOIN_NETWORK === 'calibration' ? env.FILECOIN_RPC_WS : 'wss://api.calibration.node.glif.io/rpc/v1'
  }
}

// Optional GLIF token for higher rate limits
let glifToken: string | null = null

/**
 * Set the GLIF authorization token for higher RPC rate limits
 * @param token The GLIF token
 */
export function setGlifToken(token: string) {
  glifToken = token
}

/**
 * Initialize Synapse SDK with browser provider (MetaMask)
 * @param provider The ethers provider from MetaMask
 * @param network The Filecoin network to use (defaults to environment setting)
 * @returns A Synapse instance
 */
export async function initSynapseBrowser(
  provider: any,
  network?: 'mainnet' | 'calibration'
) {
  // Use environment variable if network not specified
  const networkToUse = network || (env.FILECOIN_NETWORK as 'mainnet' | 'calibration')
  
  console.log(`Initializing Synapse SDK with browser provider for ${networkToUse} network`)
  
  const synapse = await Synapse.create({
    provider,
    rpcURL: RPC_URLS[networkToUse].websocket,
    authorization: glifToken ? `Bearer ${glifToken}` : undefined
  })
  
  return synapse
}

/**
 * Initialize Synapse SDK with private key (server-side)
 * @param privateKey The private key to use for authentication (defaults to environment variable)
 * @param network The Filecoin network to use (defaults to environment setting)
 * @returns A Synapse instance
 */
export async function initSynapseServer(
  privateKey?: string,
  network?: 'mainnet' | 'calibration'
) {
  // Use environment variables if parameters not specified
  const privateKeyToUse = privateKey || env.PRIVATE_KEY
  const networkToUse = network || (env.FILECOIN_NETWORK as 'mainnet' | 'calibration')
  
  if (!privateKeyToUse) {
    throw new Error('Private key is required for server-side initialization')
  }
  
  console.log(`Initializing Synapse SDK with private key for ${networkToUse} network`)
  
  const synapse = await Synapse.create({
    privateKey: privateKeyToUse,
    rpcURL: RPC_URLS[networkToUse].http,
    authorization: glifToken ? `Bearer ${glifToken}` : undefined
  })
  
  return synapse
}

/**
 * Get the Filecoin Explorer URL for a deal
 * @param dealId The Filecoin deal ID
 * @param network The Filecoin network (defaults to environment setting)
 * @returns The explorer URL
 */
export function getFilecoinExplorerURL(
  dealId: string, 
  network?: 'mainnet' | 'calibration'
): string {
  // Use environment variable if network not specified
  const networkToUse = network || env.FILECOIN_NETWORK
  
  const baseUrl = networkToUse === 'mainnet' 
    ? 'https://filfox.info/en/deal/' 
    : 'https://calibration.filfox.info/en/deal/'
  
  return `${baseUrl}${dealId}`
}
