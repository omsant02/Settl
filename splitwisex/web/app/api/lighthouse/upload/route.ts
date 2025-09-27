/**
 * Next.js API route that proxies to the standalone Lighthouse service
 */

import { NextRequest, NextResponse } from 'next/server';

// Define allowed origins for CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001'
];

const LIGHTHOUSE_SERVICE_URL = process.env.LIGHTHOUSE_SERVICE_URL || 'http://localhost:3002';

// Helper function to add CORS headers
function addCorsHeaders(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get('origin') || '';
  
  // Check if the origin is allowed
  if (allowedOrigins.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    // For local development, allow all origins
    res.headers.set('Access-Control-Allow-Origin', '*');
  }
  
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return res;
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const response = NextResponse.json({}, { status: 200 });
  return addCorsHeaders(request, response);
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 API Route: Received upload request');

    // Get the form data from the request
    const formData = await request.formData();

    // Log form data keys for debugging (don't log file content)
    const keys = Array.from(formData.keys());
    console.log('📝 API Route: FormData keys:', keys);

    // Check if encryption parameters are present
    const encrypted = formData.get('encrypted');
    const publicKey = formData.get('publicKey');
    const signedMessage = formData.get('signedMessage');
    const encryptionType = formData.get('encryptionType') || 'standard';
    const privateKey = formData.get('privateKey');
    
    console.log('🔐 API Route: Encryption params:', {
      encrypted: encrypted?.toString(),
      publicKey: publicKey?.toString()?.slice(0, 10) + '...',
      hasSignedMessage: !!signedMessage,
      encryptionType: encryptionType?.toString(),
      hasPrivateKey: !!privateKey
    });

    console.log(`📤 API Route: Forwarding to ${LIGHTHOUSE_SERVICE_URL}/upload`);

    // Check if the Lighthouse service is running
    try {
      const healthCheck = await fetch(`${LIGHTHOUSE_SERVICE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (healthCheck.ok) {
        console.log('✅ API Route: Lighthouse service is running:', await healthCheck.json());
      } else {
        console.error('❌ API Route: Lighthouse service health check failed:', healthCheck.status, healthCheck.statusText);
      }
    } catch (healthError) {
      console.error('❌ API Route: Lighthouse service health check error:', healthError instanceof Error ? healthError.message : healthError);
    }

    console.log('⏱️ API Route: Setting up request with 120s timeout');
    
    // Forward the request to the standalone Lighthouse service with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout (2 minutes)
    
    try {
      const response = await fetch(`${LIGHTHOUSE_SERVICE_URL}/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('📥 API Route: Response received from Lighthouse service');
      console.log('  - Status:', response.status, response.statusText);
      console.log('  - Headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('📄 API Route: Response data:', data);

      let jsonResponse;
      if (response.ok) {
        jsonResponse = NextResponse.json(data);
      } else {
        jsonResponse = NextResponse.json(data, { status: response.status });
      }
      
      // Add CORS headers
      return addCorsHeaders(request, jsonResponse);
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('⏱️ API Route: Request to Lighthouse service timed out after 120s');
        const timeoutResponse = NextResponse.json({
          success: false,
          error: 'Request to Lighthouse service timed out after 120 seconds'
        }, { status: 504 }); // Gateway Timeout
        
        return addCorsHeaders(request, timeoutResponse);
      }
      
      throw fetchError; // Re-throw for the outer catch
    }

  } catch (error) {
    console.error('❌ API Route: Lighthouse upload proxy error:', error);
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
    
    return addCorsHeaders(request, errorResponse);
  }
}