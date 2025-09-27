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
      // Try different Lighthouse API endpoints
      const endpoints = [
        'https://api.lighthouse.storage/api/access/conditions',
        'https://encryption-api.lighthouse.storage/api/access/conditions',
        'https://encryption.lighthouse.storage/api/access/conditions'
      ];
      
      let response = null;
      let responseText = '';
      let success = false;
      
      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 API Route: Trying endpoint: ${endpoint}`);
          
          response = await fetch(endpoint, {
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
          
          responseText = await response.text();
          console.log(`📥 API Route: Response from ${endpoint}:`, response.status, responseText.substring(0, 100));
          
          if (response.ok) {
            success = true;
            break;
          }
        } catch (endpointError) {
          console.error(`❌ API Route: Error with endpoint ${endpoint}:`, endpointError);
        }
      }
      
      if (!success) {
        return addCorsHeaders(NextResponse.json(
          { success: false, error: responseText || 'Failed to apply access control with all endpoints' },
          { status: response?.status || 500 }
        ));
      }
      
      // Try to parse the response as JSON
      try {
        const data = JSON.parse(responseText);
        console.log('✅ API Route: Access control applied successfully');
        
        return addCorsHeaders(NextResponse.json({
          success: true,
          data: data
        }));
      } catch (parseError) {
        console.error('❌ API Route: Failed to parse response as JSON:', parseError);
        return addCorsHeaders(NextResponse.json(
          { success: false, error: 'Invalid JSON response from Lighthouse API', rawResponse: responseText },
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
