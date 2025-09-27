/**
 * API route to check if a wallet address is the owner of a file
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
    const body = await request.json();
    const { hash, publicKey } = body;
    
    if (!hash || !publicKey) {
      return addCorsHeaders(NextResponse.json(
        { success: false, error: 'File hash and public key are required' },
        { status: 400 }
      ));
    }
    
    console.log('🔍 API Route: Checking file ownership for:', hash);
    console.log('👤 Wallet address:', publicKey);
    
    // Forward the ownership check request to the Lighthouse service
    try {
      // Set up request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Call Lighthouse service to check ownership
      const response = await fetch(`${LIGHTHOUSE_SERVICE_URL}/check-owner/${hash}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // When ownership check fails, we should NOT assume ownership
        console.log('⚠️ API Route: Ownership check endpoint error, defaulting to not owner');
        
        return addCorsHeaders(NextResponse.json({
          success: true,
          isOwner: false,
          message: 'Ownership check failed, defaulting to not owner'
        }));
      }
      
      // Parse the response
      const data = await response.json();
      console.log('✅ API Route: Ownership check result:', data);
      
      return addCorsHeaders(NextResponse.json({
        success: true,
        isOwner: data.isOwner || false,
        message: data.message || 'Ownership check completed'
      }));
      
    } catch (error) {
      console.error('❌ API Route: Error checking ownership:', error);
      
      // In case of error, we should NOT assume ownership
      return addCorsHeaders(NextResponse.json({
        success: true,
        isOwner: false,
        message: 'Error checking ownership, defaulting to not owner'
      }));
    }
    
  } catch (error) {
    console.error('❌ API Route: Ownership check error:', error);
    
    return addCorsHeaders(NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    ));
  }
}
