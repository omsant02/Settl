/**
 * Filecoin Service Client
 * 
 * This module provides a client for the standalone Filecoin service.
 * It's used by the Next.js application to interact with the Filecoin network
 * without having to handle WebSocket connections directly.
 */

export interface FilecoinServiceConfig {
  serviceUrl: string;
  timeout?: number;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Client for the Filecoin Service
 */
export class FilecoinServiceClient {
  private serviceUrl: string;
  private timeout: number;
  
  constructor(config: FilecoinServiceConfig) {
    this.serviceUrl = config.serviceUrl || process.env.NEXT_PUBLIC_FILECOIN_SERVICE_URL || 'http://localhost:3001';
    this.timeout = config.timeout || 30000; // 30 seconds default
  }
  
  /**
   * Call the Filecoin service with timeout
   */
  async callService<T = any>(endpoint: string, method = 'GET', body?: any): Promise<ServiceResponse<T>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const url = `${this.serviceUrl}${endpoint}`;
      console.log(`🔄 Calling Filecoin service: ${method} ${url}`);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Filecoin service error (${response.status}): ${errorText}`);
      }
      
      // For binary responses (file downloads)
      if (response.headers.get('content-type')?.includes('application/octet-stream')) {
        const buffer = await response.arrayBuffer();
        return { 
          success: true, 
          data: new Uint8Array(buffer) as unknown as T
        };
      }
      
      return {
        success: true,
        data: await response.json()
      };
    } catch (error) {
      console.error('❌ Filecoin service call failed:', error);
      
      if ((error as Error)?.name === 'AbortError') {
        return {
          success: false,
          error: `Request timed out after ${this.timeout}ms`
        };
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Get service status
   */
  async getStatus() {
    return this.callService('/status');
  }
  
  /**
   * Set up Filecoin payments (one-time)
   */
  async setupPayments() {
    return this.callService('/setup', 'POST');
  }
  
  /**
   * Upload a file to Filecoin
   */
  async uploadFile(fileData: Buffer | Uint8Array, metadata = {}) {
    // Convert buffer to base64 for JSON transport
    const base64Data = Buffer.from(fileData).toString('base64');
    
    return this.callService('/upload', 'POST', {
      fileData: base64Data,
      metadata
    });
  }
  
  /**
   * Download a file from Filecoin
   */
  async downloadFile(pieceCid: string) {
    return this.callService(`/download/${pieceCid}`);
  }
}

// Export a singleton instance for use throughout the app
export const filecoinService = new FilecoinServiceClient({
  serviceUrl: process.env.NEXT_PUBLIC_FILECOIN_SERVICE_URL || 'http://localhost:3001'
});


