/**
 * Entry point for the Filecoin service
 * Exports core functionality for use in other parts of the application
 */

// Export the ReceiptStorage class and related types
export {
  ReceiptStorage,
  ReceiptStorageResult,
  ReceiptDownloadResult,
  ReceiptMetadata
} from './synapse/ReceiptStorage';

// Export the service URL for clients to connect to
export const FILECOIN_SERVICE_URL = process.env.FILECOIN_SERVICE_URL || 'http://localhost:3001';

/**
 * Call the Filecoin service API
 * @param endpoint The API endpoint to call (e.g., '/upload')
 * @param method The HTTP method to use
 * @param body The request body (for POST requests)
 * @returns The API response
 */
export async function callFilecoinService(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<any> {
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
      return { success: true, data: new Uint8Array(buffer) };
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Filecoin service call failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Re-export server for direct execution
export { default as server } from './server';


