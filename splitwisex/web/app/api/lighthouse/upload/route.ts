/**
 * Next.js API route that proxies to the standalone Lighthouse service
 */

import { NextRequest, NextResponse } from 'next/server';

const LIGHTHOUSE_SERVICE_URL = process.env.LIGHTHOUSE_SERVICE_URL || 'http://localhost:3002';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 API Route: Received upload request')

    // Get the form data from the request
    const formData = await request.formData();

    // Log form data keys for debugging (don't log file content)
    const keys = Array.from(formData.keys())
    console.log('📝 API Route: FormData keys:', keys)

    // Check if encryption parameters are present
    const encrypted = formData.get('encrypted')
    const publicKey = formData.get('publicKey')
    const signedMessage = formData.get('signedMessage')
    const encryptionType = formData.get('encryptionType') || 'standard'
    const privateKey = formData.get('privateKey')
    
    console.log('🔐 API Route: Encryption params:', {
      encrypted: encrypted?.toString(),
      publicKey: publicKey?.toString()?.slice(0, 10) + '...',
      hasSignedMessage: !!signedMessage,
      encryptionType: encryptionType?.toString(),
      hasPrivateKey: !!privateKey
    })

    console.log(`📤 API Route: Forwarding to ${LIGHTHOUSE_SERVICE_URL}/upload`)

    // Forward the request to the standalone Lighthouse service
    const response = await fetch(`${LIGHTHOUSE_SERVICE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    console.log('📥 API Route: Response from Lighthouse service:', response.status, response.statusText)

    const data = await response.json();
    console.log('📄 API Route: Response data:', data)

    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(data, { status: response.status });
    }

  } catch (error) {
    console.error('❌ API Route: Lighthouse upload proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}