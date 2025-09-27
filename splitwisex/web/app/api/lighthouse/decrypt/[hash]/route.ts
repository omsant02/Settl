/**
 * Decrypt file from Lighthouse service
 */

import { NextRequest, NextResponse } from 'next/server';

const LIGHTHOUSE_SERVICE_URL = process.env.LIGHTHOUSE_SERVICE_URL || 'http://localhost:3002';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    console.log('🔓 API Route: Received decrypt request')

    const { hash } = await params;
    const body = await request.json();

    console.log('📝 API Route: Decrypt params:', {
      hash,
      publicKey: body.publicKey?.slice(0, 10) + '...',
      hasSignedMessage: !!body.signedMessage,
      mimeType: body.mimeType
    });

    if (!hash) {
      return NextResponse.json(
        { success: false, error: 'Hash is required' },
        { status: 400 }
      );
    }

    if (!body.publicKey || !body.signedMessage) {
      return NextResponse.json(
        { success: false, error: 'Public key and signed message required for decryption' },
        { status: 400 }
      );
    }

    console.log(`📤 API Route: Forwarding decrypt request to ${LIGHTHOUSE_SERVICE_URL}/decrypt/${hash}`);

    // Forward the request to the standalone Lighthouse service
    const response = await fetch(`${LIGHTHOUSE_SERVICE_URL}/decrypt/${hash}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📥 API Route: Decrypt response from Lighthouse service:', response.status, response.statusText);

    if (response.ok) {
      // Forward the binary data (decrypted file)
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const buffer = await response.arrayBuffer();

      console.log('✅ API Route: Decryption successful, returning file data');

      return new NextResponse(Buffer.from(buffer), {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } else {
      const errorData = await response.json();
      console.error('❌ API Route: Decryption failed:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

  } catch (error) {
    console.error('❌ API Route: Decrypt proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}