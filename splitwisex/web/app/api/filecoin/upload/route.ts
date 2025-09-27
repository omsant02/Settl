/**
 * Server-side Filecoin upload API using Synapse SDK
 * Company pays for storage - users upload receipts for free
 */

import { NextRequest, NextResponse } from 'next/server'
import { uploadReceipt } from '@/lib/filecoin-receipt-storage'

export async function POST(request: NextRequest) {
  try {
    // Get the uploaded file
    const formData = await request.formData()
    const file = formData.get('file') as File
    const expenseId = formData.get('expenseId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log('Server-side Filecoin upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      expenseId
    })

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Filecoin via Synapse SDK (company pays)
    const result = await uploadReceipt(buffer, {
      fileName: file.name,
      fileType: file.type,
      expenseId,
      uploadedAt: new Date().toISOString()
    })

    if (result.success && result.pieceCid) {
      console.log('Filecoin upload successful:', result)

      // TODO: Store in database
      // await db.receipts.create({
      //   expenseId: parseInt(expenseId),
      //   pieceCid: result.pieceCid,
      //   fileName: file.name,
      //   fileSize: result.size,
      //   uploadedAt: new Date()
      // })

      return NextResponse.json({
        success: true,
        storageId: `filecoin:${result.pieceCid}`,
        pieceCid: result.pieceCid,
        size: result.size,
        network: 'Filecoin Calibration',
        gatewayUrl: `https://dweb.link/ipfs/${result.pieceCid}`,
        explorerUrl: `https://calibration.filfox.info/en/search/${result.pieceCid}`
      })

    } else {
      console.error('Filecoin upload failed:', result.error)
      return NextResponse.json(
        { error: `Filecoin upload failed: ${result.error}` },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('API upload error:', error)
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}