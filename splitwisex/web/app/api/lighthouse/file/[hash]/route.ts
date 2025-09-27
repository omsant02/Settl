/**
 * Get file info from Lighthouse service
 */

import { NextRequest, NextResponse } from 'next/server';

const LIGHTHOUSE_SERVICE_URL = process.env.LIGHTHOUSE_SERVICE_URL || 'http://localhost:3002';

export async function GET(
  _request: NextRequest,
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
    const response = await fetch(`${LIGHTHOUSE_SERVICE_URL}/file/${hash}`);
    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(data, { status: response.status });
    }

  } catch (error) {
    console.error('Lighthouse file info proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}