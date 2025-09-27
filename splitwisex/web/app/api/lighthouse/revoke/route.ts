/**
 * API route to revoke access to a shared encrypted file
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

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { hash, publicKey, signedMessage, revokeAddresses } = body;
    
    if (!hash || !publicKey || !signedMessage || !revokeAddresses || !Array.isArray(revokeAddresses)) {
      return addCorsHeaders(NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters: hash, publicKey, signedMessage, and revokeAddresses array are required' 
        },
        { status: 400 }
      ));
    }
    
    console.log('🚫 API Route: Revoking access for file:', hash);
    console.log('👤 API Route: Owner:', publicKey);
    console.log('🔄 API Route: Revoking access from:', revokeAddresses);
    
    // Set up request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      // Forward the revoke request to our Lighthouse service
      const response = await fetch(`${LIGHTHOUSE_SERVICE_URL}/revoke/${hash}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey, signedMessage, revokeAddresses }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('❌ API Route: Revoke request failed:', response.status, response.statusText);
        
        // Try to get error details
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = errorData.error || `Status: ${response.status}`;
        } catch (e) {
          errorText = `Status: ${response.status} ${response.statusText}`;
        }
        
        return addCorsHeaders(NextResponse.json(
          { success: false, error: errorText },
          { status: response.status }
        ));
      }
      
      const data = await response.json();
      console.log('✅ API Route: Access revoked successfully:', data);
      
      return addCorsHeaders(NextResponse.json(data));
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('❌ API Route: Error revoking access:', fetchError);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return addCorsHeaders(NextResponse.json(
          { success: false, error: 'Revoke request timed out' },
          { status: 504 }
        ));
      }
      
      return addCorsHeaders(NextResponse.json(
        { success: false, error: fetchError instanceof Error ? fetchError.message : 'Unknown error' },
        { status: 500 }
      ));
    }
    
  } catch (error) {
    console.error('❌ API Route: Revoke access error:', error);
    
    return addCorsHeaders(NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    ));
  }
}
