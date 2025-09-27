/**
 * API route to decrypt a file from Lighthouse
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

export async function POST(
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
    
    // Parse request body
    const body = await request.json();
    const { publicKey, signedMessage, mimeType } = body;
    
    if (!publicKey || !signedMessage) {
      return addCorsHeaders(NextResponse.json(
        { success: false, error: 'Public key and signed message are required' },
        { status: 400 }
      ));
    }
    
    console.log('🔓 API Route: Decrypting file:', hash, 'for user:', publicKey);
    
    // Try our local service first (most reliable method)
    try {
      console.log('🔄 API Route: Trying local service for decryption');
      
      // Set up request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch(`${LIGHTHOUSE_SERVICE_URL}/decrypt/${hash}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey, signedMessage, mimeType }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('❌ API Route: Local service decryption failed:', response.status, response.statusText);
        
        // Try to get error details
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Failed to get error details';
        }
        
        throw new Error(`Local service decryption failed: ${errorText}`);
      }
      
      // Get content type and data - use the actual content type from the response
      const contentType = response.headers.get('content-type') || mimeType || 'application/octet-stream';
      const customContentType = response.headers.get('x-content-type-detected');
      const data = await response.arrayBuffer();
      
      console.log('✅ API Route: File decrypted successfully via local service');
      console.log('📊 API Route: Decrypted file size:', data.byteLength, 'bytes');
      console.log('🔤 API Route: Content-Type:', contentType);
      if (customContentType) {
        console.log('🔤 API Route: Detected Content-Type:', customContentType);
      }
      
      if (data.byteLength === 0) {
        throw new Error('Decryption returned an empty file');
      }
      
      // Create response with the decrypted file data - IMPORTANT: Use Buffer.from to properly handle binary data
      const decryptedResponse = new NextResponse(Buffer.from(data));
      
      // Set appropriate headers for file download
      decryptedResponse.headers.set('Content-Type', customContentType || contentType);
      decryptedResponse.headers.set('Content-Disposition', `attachment; filename="${hash}"`);
      decryptedResponse.headers.set('Content-Length', data.byteLength.toString());
      decryptedResponse.headers.set('Cache-Control', 'no-store, no-cache');
      
      // Add CORS headers
      return addCorsHeaders(decryptedResponse);
      
    } catch (localServiceError) {
      console.error('❌ API Route: Local service decryption failed:', localServiceError);
      
      // If local service fails, try direct Lighthouse API
      try {
        console.log('🔑 API Route: Using direct Lighthouse API for decryption');
        
        // Make a direct call to the Lighthouse decryption API
        const decryptionUrl = `https://decrypt-api.lighthouse.storage/api/decrypt`;
        const decryptionResponse = await fetch(decryptionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cid: hash,
            publicKey: publicKey,
            signedMessage: signedMessage
          })
        });
        
        if (decryptionResponse.ok) {
          // Get the actual content type from the response
          const contentType = decryptionResponse.headers.get('content-type') || mimeType || 'application/octet-stream';
          const data = await decryptionResponse.arrayBuffer();
          
          console.log('✅ API Route: File decrypted successfully using Lighthouse API');
          console.log('📊 API Route: Decrypted file size:', data.byteLength, 'bytes');
          console.log('🔤 API Route: Content-Type:', contentType);
          
          // Create response with the decrypted file data
          const decryptedResponse = new NextResponse(Buffer.from(data));
          decryptedResponse.headers.set('Content-Type', contentType);
          decryptedResponse.headers.set('Content-Disposition', `attachment; filename="${hash}"`);
          decryptedResponse.headers.set('Content-Length', data.byteLength.toString());
          decryptedResponse.headers.set('Cache-Control', 'no-store, no-cache');
          
          // Add CORS headers
          return addCorsHeaders(decryptedResponse);
        } else {
          throw new Error(`Lighthouse API decryption failed with status ${decryptionResponse.status}`);
        }
      } catch (directApiError) {
        console.error('❌ API Route: Direct Lighthouse API error:', directApiError);
        
        const localServiceErrorMessage = localServiceError instanceof Error 
          ? localServiceError.message 
          : 'Unknown local service error';
          
        const directApiErrorMessage = directApiError instanceof Error 
          ? directApiError.message 
          : 'Unknown direct API error';
          
        throw new Error(`All decryption methods failed: ${localServiceErrorMessage}, ${directApiErrorMessage}`);
      }
    }
    
  } catch (error) {
    console.error('❌ API Route: Decryption error:', error);
    
    return addCorsHeaders(NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    ));
  }
}