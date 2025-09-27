/**
 * Download file from Lighthouse service
 */

import { NextRequest, NextResponse } from 'next/server';

const LIGHTHOUSE_SERVICE_URL = process.env.LIGHTHOUSE_SERVICE_URL || 'http://localhost:3002';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params;

    if (!hash) {
      return NextResponse.json(
        { success: false, error: 'Hash is required' },
        { status: 400 }
      );
    }

    // Forward the request to the standalone Lighthouse service
    const response = await fetch(`${LIGHTHOUSE_SERVICE_URL}/download/${hash}`);

    if (response.ok) {
      // Proxy the file response
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const contentLength = response.headers.get('content-length');

      const headers: HeadersInit = {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      };

      if (contentLength) {
        headers['Content-Length'] = contentLength;
      }

      const buffer = await response.arrayBuffer();
      return new NextResponse(Buffer.from(buffer), { headers });

    } else {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

  } catch (error) {
    console.error('Lighthouse download proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}