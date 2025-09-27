import { NextRequest, NextResponse } from 'next/server';
import kavach from '@lighthouse-web3/kavach';

export async function POST(request: NextRequest) {
  try {
    const { publicKey } = await request.json();

    if (!publicKey) {
      return NextResponse.json(
        { error: 'Public key is required' },
        { status: 400 }
      );
    }

    // Use kavach for proper JWT authentication (compatible with Node.js encryption)
    const authMessage = await kavach.getAuthMessage(publicKey);

    if (!authMessage.message) {
      return NextResponse.json(
        { error: 'Failed to get auth message from Kavach' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: authMessage.message
    });

  } catch (error) {
    console.error('Auth message API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get auth message' },
      { status: 500 }
    );
  }
}