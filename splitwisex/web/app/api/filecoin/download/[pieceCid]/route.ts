/**
 * Download receipt from Filecoin using Synapse SDK
 */

import { NextRequest, NextResponse } from 'next/server'
import { getReceiptStorage } from '@/lib/filecoin-receipt-storage'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pieceCid: string }> }
) {
  try {
    // Get piece CID from params
    const { pieceCid } = await params

    if (!pieceCid) {
      return NextResponse.json(
        { error: 'Piece CID is required' },
        { status: 400 }
      )
    }

    console.log('Downloading receipt from Filecoin:', pieceCid)

    // Get receipt storage instance
    const receiptStorage = getReceiptStorage()

    // Download from Filecoin
    const result = await receiptStorage.downloadReceipt(pieceCid)

    if (result.success && result.data) {
      console.log('Filecoin download successful:', {
        pieceCid,
        size: result.data.length
      })

      // Return the file data
      return new NextResponse(Buffer.from(result.data), {
        headers: {
          'Content-Type': 'image/jpeg', // Default to JPEG, should be dynamic based on file type
          'Content-Disposition': `inline; filename="receipt-${pieceCid.slice(-8)}.jpg"`,
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      })

    } else {
      console.error('Filecoin download failed:', result.error)
      return NextResponse.json(
        { error: `Download failed: ${result.error}` },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('API download error:', error)
    return NextResponse.json(
      { error: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}