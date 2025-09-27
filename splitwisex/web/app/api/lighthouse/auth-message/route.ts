/**
 * API route to get authentication message from Lighthouse
 */

import { NextRequest, NextResponse } from 'next/server';

const LIGHTHOUSE_SERVICE_URL = process.env.LIGHTHOUSE_SERVICE_URL || 'http://localhost:3002';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicKey } = body;
    
    if (!publicKey) {
      return NextResponse.json(
        { success: false, error: 'Public key is required' },
        { status: 400 }
      );
    }
    
    console.log('📋 API Route: Getting auth message for:', publicKey);
    
    // Call Lighthouse service to get auth message
    const response = await fetch(`${LIGHTHOUSE_SERVICE_URL}/auth-message/${publicKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      console.error('❌ API Route: Failed to get auth message:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, error: `Failed to get auth message: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ API Route: Auth message retrieved');
    
    const jsonResponse = NextResponse.json({
      success: true,
      message: data.message
    });
    
    // Add CORS headers
    jsonResponse.headers.set('Access-Control-Allow-Origin', '*');
    return jsonResponse;
    
  } catch (error) {
    console.error('❌ API Route: Auth message error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}