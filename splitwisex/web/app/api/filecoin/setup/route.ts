import { NextResponse } from 'next/server'
import { setupPayments, getStorageStats } from '@/lib/filecoin-receipt-storage'

export async function POST() {
  try {
    console.log('🚀 API: Setting up Filecoin payments...')

    // Check current stats
    const stats = await getStorageStats()
    console.log('Current stats:', stats)

    // Setup payments - this approves the Warm Storage service
    await setupPayments()

    return NextResponse.json({
      success: true,
      message: 'Filecoin payment setup completed successfully!',
      stats: await getStorageStats()
    })

  } catch (error) {
    console.error('❌ API: Payment setup failed:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Payment setup failed'
    }, { status: 500 })
  }
}