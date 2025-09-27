/**
 * Server-side Filecoin Receipt Storage using Synapse SDK
 * Company pays for storage - users don't need to pay
 */

import { ethers } from 'ethers';

/**
 * Define interfaces for receipt storage operations
 */
export interface ReceiptStorageResult {
  success: boolean;
  pieceCid?: string;
  size?: number;
  error?: string;
}

export interface ReceiptDownloadResult {
  success: boolean;
  data?: Uint8Array | Buffer;
  error?: string;
}

export interface ReceiptMetadata {
  fileName?: string;
  fileType?: string;
  expenseId?: string;
  uploadedAt?: string;
}

// Define the Filecoin service URL from environment or default to localhost
const FILECOIN_SERVICE_URL = process.env.NEXT_PUBLIC_FILECOIN_SERVICE_URL || 'http://localhost:3001';

/**
 * Call the standalone Filecoin service instead of using Synapse SDK directly
 * This avoids WebSocket connection issues in Next.js API routes
 */
async function callFilecoinService<T = any>(endpoint: string, method = 'GET', body?: any): Promise<T> {
  try {
    const url = `${FILECOIN_SERVICE_URL}${endpoint}`;
    console.log(`🔄 Calling Filecoin service: ${method} ${url}`);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Filecoin service error (${response.status}): ${errorText}`);
    }
    
    // For binary responses (file downloads)
    if (response.headers.get('content-type')?.includes('application/octet-stream')) {
      const buffer = await response.arrayBuffer();
      return { 
        success: true, 
        data: new Uint8Array(buffer) 
      } as unknown as T;
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error('❌ Filecoin service call failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    } as unknown as T;
  }
}

export async function uploadReceipt(receiptBuffer: Buffer, metadata = {}): Promise<ReceiptStorageResult> {
  try {
    console.log('📤 Uploading receipt to Filecoin service...', {
      size: receiptBuffer.length,
      metadata
    });

    // Import the service client (only when needed to avoid circular dependencies)
    const { filecoinService } = await import('./filecoin-service');

    // Use the service client to upload
    const result = await filecoinService.uploadFile(receiptBuffer, metadata);

    if (result.success && result.data?.pieceCid) {
      console.log('✅ Receipt uploaded successfully to Filecoin:', result.data);
      return result.data;
    } else {
      console.error('❌ Upload failed:', result.error);
      return {
        success: false,
        error: result.error || 'Unknown upload error'
      };
    }
  } catch (error) {
    console.error('❌ Receipt upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function downloadReceipt(pieceCid: string): Promise<{ success: boolean; data?: Buffer; error?: string }> {
  try {
    console.log('📥 Downloading receipt from Filecoin:', pieceCid);

    // Import the service client
    const { filecoinService } = await import('./filecoin-service');

    // Use the service client to download
    const result = await filecoinService.downloadFile(pieceCid);

    if (result.success && result.data) {
      return {
        success: true,
        data: Buffer.from(result.data as Uint8Array)
      };
    } else {
      console.error('❌ Download failed:', result.error);
      return {
        success: false,
        error: result.error || 'File not found'
      };
    }
  } catch (error) {
    console.error('❌ Receipt download failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function checkBalance(): Promise<string> {
  try {
    console.log('🔍 Checking USDFC balance via service...');

    // Import the service client
    const { filecoinService } = await import('./filecoin-service');

    // Get status from the service
    const result = await filecoinService.getStatus();

    if (result.success && result.data) {
      // Extract balance from service response
      const balanceStr = result.data.balance || '$0 USDFC';
      
      // Parse the balance string format "$X.XX USDFC"
      const match = balanceStr.match(/\$?(\d+(\.\d+)?)\s*USDFC/);
      const balance = match ? match[1] : '0';
      
      console.log('💰 Current balance from service:', balance, 'USDFC');
      return balance;
    } else {
      console.error('❌ Balance check failed:', result.error);
      return '0';
    }
  } catch (error) {
    console.error('❌ Balance check failed:', error);
    return '0';
  }
}

export async function getStorageStats() {
  try {
    // Import the service client
    const { filecoinService } = await import('./filecoin-service');

    // Get status directly from service
    const result = await filecoinService.getStatus();
    
    if (result.success && result.data) {
      return result.data;
    }
    
    // Fallback to local balance check
    const balance = await checkBalance();
    
    return {
      balance: `$${balance} USDFC`,
      network: 'Filecoin Calibration',
      service: 'Filecoin Service',
      status: 'ready'
    };
  } catch (error) {
    return {
      balance: 'Unknown',
      network: 'Filecoin Calibration',
      service: 'Filecoin Service',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Receipt Storage class-like interface for API compatibility
export class ReceiptStorage {
  async getStorageStats() {
    return getStorageStats()
  }

  async setupPayments() {
    return setupPayments()
  }

  async uploadReceipt(receiptBuffer: Buffer, metadata = {}) {
    return uploadReceipt(receiptBuffer, metadata)
  }

  async downloadReceipt(pieceCid: string) {
    return downloadReceipt(pieceCid)
  }

  async checkBalance() {
    return checkBalance()
  }
}

// Singleton instance
let receiptStorageInstance: ReceiptStorage | null = null

export function getReceiptStorage(): ReceiptStorage {
  if (!receiptStorageInstance) {
    receiptStorageInstance = new ReceiptStorage()
  }
  return receiptStorageInstance
}

export async function setupPayments(): Promise<void> {
  try {
    console.log('⚙️ Setting up Filecoin storage payments via service...');

    // Import the service client
    const { filecoinService } = await import('./filecoin-service');

    // Call the service's setup endpoint
    const result = await filecoinService.setupPayments();

    if (result.success) {
      console.log('✅ Storage service setup completed successfully!');
      console.log('🚀 Ready for receipt uploads!');
      return;
    } else {
      throw new Error(result.error || 'Unknown setup error');
    }
  } catch (error) {
    console.error('❌ Payment setup failed:', error);
    
    // Re-throw the error with more context
    if (error instanceof Error) {
      throw new Error(`Payment setup failed: ${error.message}`);
    } else {
      throw new Error('Payment setup failed: Unknown error');
    }
  }
}