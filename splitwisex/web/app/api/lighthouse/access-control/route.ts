/**
 * API route to apply access control (encryption) to files via Lighthouse
 */

import { NextRequest, NextResponse } from 'next/server';

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
    // Parse the request body
    const body = await request.json();
    const { cid, accessCondition, aggregator, publicKey, signedMessage } = body;
    
    // Validate required fields
    if (!cid || !accessCondition || !aggregator || !publicKey || !signedMessage) {
      return addCorsHeaders(NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      ));
    }
    
    console.log('🔐 API Route: Applying access control to file:', cid);
    
    // Log the request we're sending (excluding sensitive data)
    console.log('📤 API Route: Sending access control request to Lighthouse:', {
      cid,
      hasAccessCondition: !!accessCondition,
      aggregator,
      publicKey: publicKey.slice(0, 10) + '...',
      hasSignedMessage: !!signedMessage
    });

    try {
      // Forward the request to the Lighthouse encryption API
      // Use the correct API endpoint URL
      const response = await fetch('https://api.lighthouse.storage/api/access/conditions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          cid,
          accessCondition,
          aggregator,
          publicKey,
          signedMessage
        })
      });
      
      // First check if the response is OK
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('❌ API Route: Access control failed:', response.status, errorText.substring(0, 200));
        } catch (e) {
          errorText = `Error status: ${response.status} ${response.statusText}`;
        }
        
        return addCorsHeaders(NextResponse.json(
          { success: false, error: errorText },
          { status: response.status }
        ));
      }
      
      // Try to parse the response as JSON
      try {
        const responseText = await response.text();
        console.log('📥 API Route: Response from Lighthouse:', responseText.substring(0, 100));
        
        const data = JSON.parse(responseText);
        console.log('✅ API Route: Access control applied successfully');
        
        return addCorsHeaders(NextResponse.json({
          success: true,
          data: data
        }));
      } catch (parseError) {
        console.error('❌ API Route: Failed to parse response as JSON:', parseError);
        return addCorsHeaders(NextResponse.json(
          { success: false, error: 'Invalid JSON response from Lighthouse API' },
          { status: 500 }
        ));
      }
    } catch (fetchError) {
      console.error('❌ API Route: Network error calling Lighthouse API:', fetchError);
      return addCorsHeaders(NextResponse.json(
        { success: false, error: fetchError instanceof Error ? fetchError.message : 'Network error' },
        { status: 503 }
      ));
    }
  } catch (error) {
    console.error('❌ API Route: Access control error:', error);
    return addCorsHeaders(NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    ));
  }
}