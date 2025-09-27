/**
 * API route that safely provides a Lighthouse API key to the frontend
 */

import { NextRequest, NextResponse } from 'next/server';

// This should be properly secured in a production environment
const LIGHTHOUSE_API_KEY = process.env.LIGHTHOUSE_API_KEY || '623716f8.d6aa8f13ef724b4f9501f4c76de9c581';

export async function GET(request: NextRequest) {
  try {
    // In a production app, you would want to verify the user is authenticated here
    // and potentially limit API key requests with rate limiting
    
    return NextResponse.json({
      success: true,
      apiKey: LIGHTHOUSE_API_KEY
    });
  } catch (error) {
    console.error('❌ API Route: Error providing API key:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
