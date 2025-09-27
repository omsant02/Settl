import { NextRequest, NextResponse } from 'next/server'
import { uploadReceiptToFilecoinServer } from '@/lib/filecoin-storage'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('Processing file for Filecoin storage:', file.name, file.size, 'bytes')

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Filecoin via Synapse SDK
    const result = await uploadReceiptToFilecoinServer(buffer, file.name)

    console.log('Successfully stored receipt on Filecoin:', result)

    return NextResponse.json({
      success: true,
      dealId: result.dealId,
      cid: result.cid,
      gatewayUrl: result.gatewayUrl,
      explorerUrl: result.explorerUrl,
      fileName: file.name,
      message: 'File uploaded to Filecoin via Synapse SDK'
    })

  } catch (error: any) {
    console.error('Filecoin upload API error:', error)
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: error.message || 'Unknown error',
        success: false
      },
      { status: 500 }
    )
  }
}