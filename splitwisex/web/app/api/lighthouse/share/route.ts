import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { cid, ownerPublicKey, signedMessage, shareToPublicKeys } = await request.json();

    if (!cid || !ownerPublicKey || !signedMessage || !shareToPublicKeys) {
      return NextResponse.json(
        { error: 'Missing required fields: cid, ownerPublicKey, signedMessage, shareToPublicKeys' },
        { status: 400 }
      );
    }

    if (!Array.isArray(shareToPublicKeys) || shareToPublicKeys.length === 0) {
      return NextResponse.json(
        { error: 'shareToPublicKeys must be a non-empty array' },
        { status: 400 }
      );
    }

    // Proxy to lighthouse standalone service
    const LIGHTHOUSE_SERVICE_URL = process.env.LIGHTHOUSE_SERVICE_URL || 'http://localhost:3002';

    const response = await fetch(`${LIGHTHOUSE_SERVICE_URL}/share/${cid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPublicKey, signedMessage, shareToPublicKeys })
    });

    const shareResult = await response.json();

    if (shareResult.success) {
      return NextResponse.json({
        success: true,
        cid,
        sharedWith: shareToPublicKeys,
        message: 'File shared successfully'
      });
    } else {
      return NextResponse.json(
        { error: shareResult.error || 'Failed to share file' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Share file API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to share file' },
      { status: 500 }
    );
  }
}