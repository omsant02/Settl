/**
 * API route to get file information from Lighthouse
 */

import { NextRequest, NextResponse } from 'next/server';

const LIGHTHOUSE_SERVICE_URL = process.env.LIGHTHOUSE_SERVICE_URL || 'http://localhost:3002';

// Add CORS headers to responses
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// Handle CORS preflight
export async function OPTIONS() {
  return addCorsHeaders(NextResponse.json({}, { status: 200 }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash } = params;
    
    if (!hash) {
      return addCorsHeaders(NextResponse.json(
        { success: false, error: 'File hash is required' },
        { status: 400 }
      ));
    }
    
    console.log('🔍 API Route: Getting file info for:', hash);
    
    // First, try to get the raw response from the Lighthouse service
    try {
      // Direct call to the Lighthouse service's file-info endpoint
      console.log('🔄 API Route: Fetching directly from Lighthouse service');
      
      // Make a direct request to the Lighthouse service
      const directResponse = await fetch(`${LIGHTHOUSE_SERVICE_URL}/file-info/${hash}`);
      
      if (directResponse.ok) {
        const directData = await directResponse.json();
        console.log('✅ API Route: Direct Lighthouse response:', JSON.stringify(directData));
        
        // Check if we have the expected data structure
        if (directData && directData.data) {
          const fileData = directData.data;
          
          // Return the processed data
          const processedData = {
            success: true,
            cid: fileData.cid || hash,
            fileName: fileData.fileName || hash,
            fileSize: fileData.fileSizeInBytes || fileData.fileSize || 0,
            mimeType: fileData.mimeType || 'application/octet-stream',
            encryptionStatus: fileData.encryption || fileData.encryptionStatus || 'unknown',
            source: 'lighthouse-direct',
            timestamp: new Date().toISOString()
          };
          
          console.log('✅ API Route: Processed file info:', processedData);
          return addCorsHeaders(NextResponse.json(processedData));
        }
      }
    } catch (directError) {
      console.error('❌ API Route: Direct Lighthouse request failed:', directError);
    }
    
    // If direct request failed, try the standard approach
    // Set up request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      console.log('🔄 API Route: Trying standard file-info request');
      const response = await fetch(`${LIGHTHOUSE_SERVICE_URL}/file-info/${hash}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('❌ API Route: File info request failed:', response.status, response.statusText);
        
        // Try to get error details
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = errorData.error || `Status: ${response.status}`;
        } catch (e) {
          errorText = `Status: ${response.status} ${response.statusText}`;
        }
        
        // Try to get file info directly from Lighthouse API
        try {
          console.log('🔄 API Route: Trying IPFS gateway for file info');
          
          // Get basic file info from IPFS gateway
          const gatewayResponse = await fetch(`https://gateway.lighthouse.storage/ipfs/${hash}`, {
            method: 'HEAD'
          });
          
          if (gatewayResponse.ok) {
            const contentType = gatewayResponse.headers.get('content-type') || 'application/octet-stream';
            const contentLength = gatewayResponse.headers.get('content-length') || '0';
            
            console.log('✅ API Route: Got basic file info from gateway');
            return addCorsHeaders(NextResponse.json({
              success: true,
              cid: hash,
              fileName: hash,
              fileSize: parseInt(contentLength),
              mimeType: contentType,
              encryptionStatus: 'unknown',
              source: 'gateway'
            }));
          }
        } catch (gatewayError) {
          console.error('❌ API Route: Gateway file info also failed:', gatewayError);
        }
        
        return addCorsHeaders(NextResponse.json(
          { success: false, error: errorText },
          { status: response.status }
        ));
      }
      
      const data = await response.json();
      console.log('✅ API Route: File info retrieved successfully:', JSON.stringify(data));
      
      // Extract the data from the Lighthouse service response
      let processedData;
      
      if (data.data) {
        // Handle nested data structure from Lighthouse service
        const fileData = data.data;
        processedData = {
          success: true,
          cid: fileData.cid || hash,
          fileName: fileData.fileName || hash,
          fileSize: fileData.fileSizeInBytes || fileData.fileSize || 0,
          mimeType: fileData.mimeType || 'application/octet-stream',
          encryptionStatus: fileData.encryption || fileData.encryptionStatus || 'unknown',
          source: 'lighthouse-service',
          timestamp: new Date().toISOString()
        };
      } else {
        // Handle direct structure from our service
        processedData = {
          success: true,
          cid: data.cid || hash,
          fileName: data.fileName || hash,
          fileSize: data.fileSize || 0,
          mimeType: data.mimeType || 'application/octet-stream',
          encryptionStatus: data.encryptionStatus || data.encryption || 'unknown',
          source: 'lighthouse-service',
          timestamp: new Date().toISOString()
        };
      }
      
      console.log('✅ API Route: Processed file info:', processedData);
      
      return addCorsHeaders(NextResponse.json(processedData));
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('❌ API Route: Error fetching file info:', fetchError);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return addCorsHeaders(NextResponse.json(
          { success: false, error: 'File info request timed out' },
          { status: 504 }
        ));
      }
      
      // As a last resort, try direct Lighthouse API
      try {
        console.log('🔄 API Route: Trying direct Lighthouse API as last resort');
        
        // Direct call to the Lighthouse API
        const apiResponse = await fetch(`https://api.lighthouse.storage/api/lighthouse/file_info?cid=${hash}`);
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          
          if (apiData && apiData.data) {
            const fileData = apiData.data;
            return addCorsHeaders(NextResponse.json({
              success: true,
              cid: hash,
              fileName: fileData.fileName || hash,
              fileSize: fileData.size || 0,
              mimeType: fileData.mimeType || 'application/octet-stream',
              encryptionStatus: fileData.encryption || 'unknown',
              source: 'lighthouse-api'
            }));
          }
        }
      } catch (apiError) {
        console.error('❌ API Route: Direct Lighthouse API also failed:', apiError);
      }
      
      // Fallback to basic info
      return addCorsHeaders(NextResponse.json({
        success: true,
        cid: hash,
        fileName: hash,
        fileSize: 0,
        mimeType: 'application/octet-stream',
        encryptionStatus: 'unknown',
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        source: 'fallback'
      }));
    }
    
  } catch (error) {
    console.error('❌ API Route: File info error:', error);
    
    return addCorsHeaders(NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    ));
  }
}