import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Create temporary file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const timestamp = Date.now()
    const uploadedFileName = `storacha-upload-${timestamp}-${file.name}`
    const tempPath = join(tmpdir(), uploadedFileName)
    await writeFile(tempPath, buffer)

    try {
      // Upload using Storacha CLI
      console.log('Uploading to Storacha via CLI:', file.name)
      const { stdout, stderr } = await execAsync(`npx @storacha/cli up "${tempPath}"`)

      console.log('Storacha CLI stdout:', stdout)
      console.log('Storacha CLI stderr:', stderr)

      if (stderr && !stderr.includes('Reading files') && !stderr.includes('Storing')) {
        console.error('Storacha CLI error:', stderr)
        throw new Error(`CLI error: ${stderr}`)
      }

      // Parse CID from CLI output
      // Storacha CLI outputs something like: "🐔 https://storacha.link/ipfs/bafybeibff..."
      const urlMatch = stdout.match(/https:\/\/storacha\.link\/ipfs\/([a-z0-9]+)/)
      const directoryCid = urlMatch ? urlMatch[1] : stdout.match(/baf[a-z0-9]+/)?.[0]

      if (!directoryCid) {
        throw new Error(`Could not parse CID from CLI output: ${stdout}`)
      }

      console.log('Successfully uploaded to Storacha with directory CID:', directoryCid)

      // The returned CID is a directory CID, we need to construct the full path to the file
      // Format: {directoryCid}/{filename}
      // Use the actual uploaded filename (with timestamp prefix)
      const fullCidPath = `${directoryCid}/${uploadedFileName}`

      console.log('Full IPFS path for direct file access:', fullCidPath)

      // Clean up temp file
      await unlink(tempPath)

      return NextResponse.json({
        success: true,
        cid: fullCidPath,
        directoryCid: directoryCid,
        fileName: uploadedFileName,
        message: 'File uploaded to IPFS via Storacha'
      })

    } catch (cliError) {
      // Clean up temp file even on error
      try {
        await unlink(tempPath)
      } catch (unlinkError) {
        console.warn('Failed to clean up temp file:', unlinkError)
      }
      throw cliError
    }

  } catch (error: any) {
    console.error('Storacha upload API error:', error)
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