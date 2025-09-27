/**
 * Filecoin utilities for SplitwiseX
 * Export main functionality for use in web app
 */

export {
  ReceiptStorage,
  getReceiptStorage,
  initializeStorage,
  type ReceiptStorageResult,
  type ReceiptDownloadResult,
  type ReceiptMetadata
} from '../synapse/ReceiptStorage'

// Filecoin network configuration
export const FILECOIN_NETWORKS = {
  calibration: {
    chainId: 314159,
    name: 'Filecoin Calibration',
    rpcUrl: 'https://api.calibration.node.glif.io/rpc/v1',
    wsUrl: 'wss://api.calibration.node.glif.io/rpc/v1',
    explorer: 'https://calibration.filfox.info',
    faucet: 'https://faucet.calibration.fildev.network'
  },
  mainnet: {
    chainId: 314,
    name: 'Filecoin Mainnet',
    rpcUrl: 'https://api.node.glif.io/rpc/v1',
    wsUrl: 'wss://api.node.glif.io/rpc/v1',
    explorer: 'https://filfox.info'
  }
} as const

// Storage gateway URLs
export const getFilecoinGatewayUrl = (pieceCid: string): string => {
  return `https://dweb.link/ipfs/${pieceCid}`
}

export const getFilecoinExplorerUrl = (pieceCid: string): string => {
  return `https://calibration.filfox.info/en/search/${pieceCid}`
}

// Helper for storage ID parsing
export const parseStorageId = (storageId: string) => {
  if (storageId.startsWith('filecoin:')) {
    const pieceCid = storageId.replace('filecoin:', '')
    return {
      type: 'filecoin' as const,
      pieceCid,
      gatewayUrl: getFilecoinGatewayUrl(pieceCid),
      explorerUrl: getFilecoinExplorerUrl(pieceCid)
    }
  }

  return {
    type: 'unknown' as const,
    raw: storageId
  }
}