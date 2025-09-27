/**
 * Filecoin storage service status and health check
 */

import { NextResponse } from 'next/server'
import { getReceiptStorage } from '@/lib/filecoin-receipt-storage'

export async function GET() {
  try {
    const receiptStorage = getReceiptStorage()
    const stats = await receiptStorage.getStorageStats()

    return NextResponse.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      ...stats
    })

  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        service: 'Filecoin Receipt Storage via Synapse SDK',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    console.log('Setting up Filecoin payments (one-time setup)...')

    const receiptStorage = getReceiptStorage()
    await receiptStorage.setupPayments()

    return NextResponse.json({
      success: true,
      message: 'Payment setup completed successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Payment setup failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}