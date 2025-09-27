import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { cid: string } }
) {
  try {
    const { cid } = params;
    const { ownerPublicKey, signedMessage, revokeFromPublicKeys } = await request.json();

    if (!ownerPublicKey || !signedMessage || !revokeFromPublicKeys) {
      return NextResponse.json(
        { error: 'Missing required fields: ownerPublicKey, signedMessage, revokeFromPublicKeys' },
        { status: 400 }
      );
    }

    if (!Array.isArray(revokeFromPublicKeys) && typeof revokeFromPublicKeys !== 'string') {
      return NextResponse.json(
        { error: 'revokeFromPublicKeys must be an array or string' },
        { status: 400 }
      );
    }

    // Proxy to lighthouse standalone service
    const LIGHTHOUSE_SERVICE_URL = process.env.LIGHTHOUSE_SERVICE_URL || 'http://localhost:3002';

    const response = await fetch(`${LIGHTHOUSE_SERVICE_URL}/revoke/${cid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPublicKey, signedMessage, revokeFromPublicKeys })
    });

    const revokeResult = await response.json();

    if (revokeResult.success) {
      return NextResponse.json({
        success: true,
        message: revokeResult.message,
        revokedFrom: revokeResult.revokedFrom,
        cid: revokeResult.cid
      });
    } else {
      return NextResponse.json(
        { error: revokeResult.error || 'Failed to revoke access' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Revoke access API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to revoke access' },
      { status: 500 }
    );
  }
}