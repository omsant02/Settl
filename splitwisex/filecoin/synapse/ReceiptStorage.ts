/**
 * Filecoin Receipt Storage using Synapse SDK
 * Company pays for storage - users upload receipts for free
 */

import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';

export interface ReceiptStorageResult {
  success: boolean
  pieceCid?: string
  size?: number
  error?: string
}

export interface ReceiptDownloadResult {
  success: boolean
  data?: Uint8Array
  error?: string
}

export interface ReceiptMetadata {
  fileName?: string
  fileType?: string
  expenseId?: string
  uploadedAt?: string
}

export class ReceiptStorage {
  private synapse: any = null

  constructor() {
    this.synapse = null
  }

  async initialize(): Promise<void> {
    // Debug environment variables
    const privateKey = process.env.COMPANY_PRIVATE_KEY!
    console.log('🔐 Private key loaded:', privateKey ? `${privateKey.slice(0, 10)}...${privateKey.slice(-4)}` : 'undefined')
    console.log('🔐 Private key length:', privateKey ? privateKey.length : 0)

    // Validate private key format
    if (!privateKey) {
      throw new Error('COMPANY_PRIVATE_KEY environment variable not found')
    }

    // Test with ethers directly to validate the private key
    try {
      const testWallet = new ethers.Wallet(privateKey)
      console.log('🔐 Private key validation successful, address:', testWallet.address)
    } catch (error) {
      console.error('❌ Private key validation failed:', error)
      throw new Error('Invalid private key format')
    }

    // Initialize Synapse with company wallet (use HTTP instead of WebSocket)
    this.synapse = await Synapse.create({
      privateKey: privateKey,
      rpcURL: RPC_URLS.calibration.http
    })

    // Debug network information
    const network = this.synapse.getNetwork()
    const chainId = this.synapse.getChainId()
    const walletAddress = this.synapse.address

    console.log('✅ Synapse SDK initialized for Filecoin receipt storage')
    console.log(`🌐 Network: ${network}`)
    console.log(`🔗 Chain ID: ${chainId}`)
    console.log(`👤 Wallet Address: ${walletAddress}`)

    // If wallet address is undefined, there's a problem with the private key
    if (!walletAddress) {
      console.error('❌ Wallet address is undefined - private key format issue!')
    }
  }

  async setupPayments(): Promise<void> {
    if (!this.synapse) {
      await this.initialize()
    }

    // Get configurable values from environment (with sensible defaults)
    const usdcPerEpoch = process.env.USDFC_PER_EPOCH ? parseInt(process.env.USDFC_PER_EPOCH) : 50
    const usdcLockup = process.env.USDFC_LOCKUP ? parseInt(process.env.USDFC_LOCKUP) : 100
    const lockupDays = process.env.LOCKUP_DAYS ? parseInt(process.env.LOCKUP_DAYS) : 90

    console.log('⚙️ Setting up storage payments with:')
    console.log(`  - ${usdcPerEpoch} USDFC per epoch`)
    console.log(`  - ${usdcLockup} USDFC lockup`)
    console.log(`  - ${lockupDays} days duration`)

    // Check current balance first
    const currentBalance = await this.checkBalance()
    const balanceNum = parseFloat(currentBalance)

    if (balanceNum < usdcLockup + 10) {
      throw new Error(`Insufficient USDFC balance! Need at least ${usdcLockup + 10} USDFC, but have ${balanceNum}`)
    }

    // Only approve storage service - company owner manages USDFC via MetaMask
    const warmStorageAddress = await this.synapse.getWarmStorageAddress()
    await this.synapse.payments.approveService(
      warmStorageAddress,
      ethers.parseUnits(usdcPerEpoch.toString(), 18),  // USDFC per epoch (configurable)
      ethers.parseUnits(usdcLockup.toString(), 18),    // USDFC lockup (configurable)
      BigInt(86400 * lockupDays)                       // Duration in seconds
    )

    console.log('✅ Storage service approved - ready for receipt storage')
    console.log(`💰 Current wallet balance: ${currentBalance} USDFC`)
  }

  // Core operation: Upload receipt to Filecoin
  async uploadReceipt(
    receiptBuffer: Buffer | Uint8Array,
    metadata: ReceiptMetadata = {}
  ): Promise<ReceiptStorageResult> {
    try {
      if (!this.synapse) {
        await this.initialize()
      }

      console.log('📤 Uploading receipt to Filecoin via Synapse SDK...', {
        size: receiptBuffer.length,
        metadata
      })

      const result = await this.synapse.storage.upload(receiptBuffer)

      return {
        success: true,
        pieceCid: result.pieceCid?.toString(),
        size: result.size
      }

    } catch (error) {
      console.error('❌ Receipt upload failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      }
    }
  }

  // Core operation: Download receipt from Filecoin
  async downloadReceipt(pieceCid: string): Promise<ReceiptDownloadResult> {
    try {
      if (!this.synapse) {
        await this.initialize()
      }

      console.log('📥 Downloading receipt from Filecoin:', pieceCid)

      const data = await this.synapse.storage.download(pieceCid)

      return {
        success: true,
        data: data
      }

    } catch (error) {
      console.error('❌ Receipt download failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown download error'
      }
    }
  }

  // Check company wallet USDFC balance
  async checkBalance(): Promise<string> {
    try {
      if (!this.synapse) {
        await this.initialize()
      }

      console.log('🔍 Checking USDFC balance...')
      console.log(`   Network: ${this.synapse.getNetwork()}`)
      console.log(`   Wallet: ${this.synapse.address}`)

      const balance = await this.synapse.payments.balance()
      console.log(`   Raw balance: ${balance}`)

      const formattedBalance = ethers.formatUnits(balance, 18)
      console.log(`   Formatted balance: ${formattedBalance}`)

      return formattedBalance

    } catch (error) {
      console.error('❌ Balance check failed:', error)
      return '0'
    }
  }

  // Get storage statistics
  async getStorageStats() {
    try {
      const balance = await this.checkBalance()

      return {
        balance: `$${balance} USDFC`,
        network: 'Filecoin Calibration',
        service: 'Synapse SDK',
        initialized: this.synapse !== null
      }

    } catch (error) {
      return {
        balance: 'Unknown',
        network: 'Filecoin Calibration',
        service: 'Synapse SDK',
        initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Singleton instance for application use
let receiptStorageInstance: ReceiptStorage | null = null

export function getReceiptStorage(): ReceiptStorage {
  if (!receiptStorageInstance) {
    receiptStorageInstance = new ReceiptStorage()
  }
  return receiptStorageInstance
}

// Initialize storage instance
export async function initializeStorage(): Promise<void> {
  const storage = getReceiptStorage()
  await storage.initialize()
}