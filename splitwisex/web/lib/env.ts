/**
 * Environment variables handling
 * 
 * This module provides a central place to access environment variables
 * with proper typing and default values.
 */

/**
 * Get an environment variable with fallback
 * @param key The environment variable key
 * @param fallback The fallback value if the environment variable is not set
 * @returns The environment variable value or fallback
 */
function getEnv(key: string, fallback: string = ''): string {
  if (typeof process === 'undefined' || typeof process.env === 'undefined') {
    return fallback
  }
  
  return process.env[key] || fallback
}

/**
 * Environment variables
 */
export const env = {
  // Filecoin network to use (mainnet or calibration)
  FILECOIN_NETWORK: getEnv('NEXT_PUBLIC_FILECOIN_NETWORK', 'calibration'),
  
  // Filecoin RPC URL
  FILECOIN_RPC_HTTP: getEnv(
    'NEXT_PUBLIC_FILECOIN_RPC_HTTP', 
    'https://api.calibration.node.glif.io/rpc/v1'
  ),
  
  FILECOIN_RPC_WS: getEnv(
    'NEXT_PUBLIC_FILECOIN_RPC_WS', 
    'wss://api.calibration.node.glif.io/rpc/v1'
  ),
  
  // IPFS gateway URL
  IPFS_GATEWAY: getEnv('NEXT_PUBLIC_IPFS_GATEWAY', 'https://w3s.link/ipfs'),
  
  // Subgraph URL
  SUBGRAPH_URL: getEnv('NEXT_PUBLIC_SUBGRAPH_URL', 'http://localhost:8000/subgraphs/name/splitwisex-ledger'),
  
  // Ledger contract address
  LEDGER_ADDRESS: getEnv('NEXT_PUBLIC_LEDGER_ADDRESS', '0x5FbDB2315678afecb367f032d93F642f64180aa3'),
  
  // Private key for server-side operations
  PRIVATE_KEY: getEnv('PRIVATE_KEY', ''),
  
  // Is development environment
  isDev: process.env.NODE_ENV !== 'production',
}

/**
 * Check if we're running on the client
 */
export const isClient = typeof window !== 'undefined'

/**
 * Check if we're running on the server
 */
export const isServer = !isClient

