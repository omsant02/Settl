import { NextRequest, NextResponse } from 'next/server';

const LIGHTHOUSE_SERVICE_URL = process.env.LIGHTHOUSE_SERVICE_URL || 'http://localhost:3002';

// Helper function to add CORS headers
function addCorsHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Content-Type-Detected');
  return res;
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  const response = NextResponse.json({}, { status: 200 });
  return addCorsHeaders(response);
}

export async function POST(request: NextRequest, { params }: { params: { hash: string } }) {
  const hash = params.hash; // Correctly access hash from params

  try {
    const requestData = await request.json();
    const { publicKey, signedMessage, mimeType, debug } = requestData;

    if (!hash || !publicKey || !signedMessage) {
      return addCorsHeaders(NextResponse.json(
        { success: false, error: 'Missing required parameters: hash, publicKey, and signedMessage' },
        { status: 400 }
      ));
    }

    console.log('🔓 API Route: Decrypting file:', hash, 'for user:', publicKey);
    console.log('  - Public Key:', publicKey.slice(0, 10) + '...');
    console.log('  - Has Signed Message:', !!signedMessage);
    console.log('  - Client MimeType Hint:', mimeType);
    
    if (debug) {
      console.log('  - Debug Info:', JSON.stringify(debug, null, 2));
    }

    let decryptedBlob: Blob | null = null;
    let detectedContentType: string = mimeType || 'application/octet-stream';
    let decryptionSource: string = 'unknown';
    let localServiceError: string | undefined;
    let directApiError: string | undefined;

    // --- Attempt 1: Try local Lighthouse service first ---
    try {
      console.log('🔄 API Route: Trying local service for decryption');
      
      // Set up request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch(`${LIGHTHOUSE_SERVICE_URL}/decrypt/${hash}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey, signedMessage, mimeType, debug }),
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
        console.log('🔑 API Route: Debug - publicKey:', publicKey);
        console.log('🔑 API Route: Debug - hash:', hash);
        
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
          // Try to get error details
          let errorText = '';
          try {
            const errorData = await decryptionResponse.json();
            errorText = JSON.stringify(errorData);
          } catch (e) {
            errorText = `Status: ${decryptionResponse.status}`;
          }
          
          throw new Error(`Lighthouse API decryption failed: ${errorText}`);
        }
      } catch (directApiError) {
        console.error('❌ API Route: Direct Lighthouse API error:', directApiError);
        
        // If both methods fail, return error
        return addCorsHeaders(NextResponse.json(
          { 
            success: false, 
            error: `Decryption failed. Local service error: ${localServiceError}. Direct API error: ${directApiError}`,
            debug: {
              publicKey,
              hash,
              timestamp: new Date().toISOString()
            }
          },
          { status: 403 } // Forbidden if decryption fails
        ));
      }
    }

  } catch (error: any) {
    console.error('❌ API Route: Decryption proxy error:', error);
    return addCorsHeaders(NextResponse.json(
      { success: false, error: error.message || 'Unknown decryption proxy error' },
      { status: 500 }
    ));
  }
}