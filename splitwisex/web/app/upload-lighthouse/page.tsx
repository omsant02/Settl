'use client'

import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSignMessage } from 'wagmi'

export default function UploadLighthouse() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [encrypted, setEncrypted] = useState(false)

  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [decrypting, setDecrypting] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return
    if (encrypted && !isConnected) {
      alert('Please connect your wallet for encrypted uploads')
      return
    }

    console.log('🚀 Starting upload...', {
      fileName: file.name,
      fileSize: file.size,
      encrypted,
      isConnected,
      address
    })

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      if (encrypted && isConnected && address) {
        console.log('🔐 Preparing encrypted upload...')

        // Get auth message from Lighthouse for encryption
        console.log('📋 Getting auth message for encryption...')
        const authResponse = await fetch(`${process.env.NEXT_PUBLIC_LIGHTHOUSE_SERVICE_URL || 'http://localhost:3002'}/auth-message/${address}`)

        if (!authResponse.ok) {
          throw new Error('Failed to get auth message for encryption')
        }

        const authData = await authResponse.json()
        const message = authData.message

        console.log('📝 Auth message to sign for encryption:', message)

        const signedMessage = await signMessageAsync({ message })

        console.log('✅ Encryption message signed successfully')
        console.log('🔑 Signed message:', signedMessage)
        console.log('👤 Public key (address):', address)

        formData.append('encrypted', 'true')
        formData.append('publicKey', address)
        formData.append('signedMessage', signedMessage)

        console.log('📦 FormData prepared with encryption parameters')
      } else {
        console.log('🌐 Preparing public upload (no encryption)')
      }

      console.log('📤 Sending request to /api/lighthouse/upload...')
      const response = await fetch('/api/lighthouse/upload', {
        method: 'POST',
        body: formData,
      })

      console.log('📥 Response received:', response.status, response.statusText)
      const data = await response.json()
      console.log('📄 Response data:', data)

      setResult(data)
    } catch (error) {
      console.error('❌ Upload failed:', error)
      setResult({ error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` })
    } finally {
      setUploading(false)
    }
  }

  const handleDecrypt = async (hash: string, mimeType: string = 'image/jpeg') => {
    if (!isConnected || !address) {
      alert('Please connect your wallet to decrypt files')
      return
    }

    console.log('🔓 Starting decryption for:', hash)
    setDecrypting(true)

    try {
      // Step 1: Get the auth message from Lighthouse
      console.log('📋 Getting auth message from Lighthouse...')
      const authResponse = await fetch(`${process.env.NEXT_PUBLIC_LIGHTHOUSE_SERVICE_URL || 'http://localhost:3002'}/auth-message/${address}`)

      if (!authResponse.ok) {
        throw new Error('Failed to get auth message from Lighthouse')
      }

      const authData = await authResponse.json()
      const messageToSign = authData.message

      console.log('📝 Auth message to sign:', messageToSign)

      // Step 2: Sign the auth message
      const signedMessage = await signMessageAsync({ message: messageToSign })
      console.log('✅ Auth message signed successfully')

      // Step 3: Call the decrypt endpoint
      console.log('📤 Calling decrypt endpoint...')
      const response = await fetch(`/api/lighthouse/decrypt/${hash}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey: address,
          signedMessage,
          mimeType
        })
      })

      console.log('📥 Decrypt response:', response.status, response.statusText)

      if (response.ok) {
        // Create a blob URL for the decrypted file
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)

        console.log('✅ Decryption successful, opening file...')
        console.log('📊 Decrypted file size:', blob.size, 'bytes')
        console.log('📊 Decrypted file type:', blob.type)

        // Show image preview if it's an image
        if (mimeType.startsWith('image/')) {
          // Create image element to show preview
          const img = document.createElement('img')
          img.src = url
          img.style.maxWidth = '300px'
          img.style.maxHeight = '300px'
          img.style.border = '2px solid green'
          img.style.borderRadius = '8px'
          img.style.margin = '10px'

          // Add to page temporarily
          document.body.appendChild(img)
          setTimeout(() => document.body.removeChild(img), 5000)
        }

        // Open in new tab or download
        const link = document.createElement('a')
        link.href = url
        link.target = '_blank'
        link.download = `decrypted-${hash.slice(-8)}.${mimeType.split('/')[1]}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up the blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } else {
        const errorData = await response.json()
        console.error('❌ Decryption failed:', errorData)
        alert(`Decryption failed: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Decryption error:', error)
      alert(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDecrypting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">

        <div className="space-y-6">
          {/* Wallet Connection */}
          <div className="border-b pb-4">
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>

          {/* Encryption Toggle */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="encryption"
              checked={encrypted}
              onChange={(e) => setEncrypted(e.target.checked)}
              disabled={!isConnected}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <label htmlFor="encryption" className="text-sm font-medium text-gray-700">
              🔐 Encrypt file (requires wallet)
            </label>
          </div>
          {encrypted && !isConnected && (
            <p className="text-xs text-amber-600">⚠️ Connect wallet to enable encryption</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose File
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploading || (encrypted && !isConnected)}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : `Upload ${encrypted ? '🔐 Encrypted' : '🌐 Public'} to Filecoin`}
          </button>

          {result && (
            <div className="mt-6 p-4 border rounded-md">
              <h3 className="font-semibold mb-2">Upload Result:</h3>

              {result.success ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>File:</strong> {result.filename}</div>
                    <div><strong>Size:</strong> {(result.size / 1024 / 1024).toFixed(2)} MB</div>
                    {result.hash && !result.hash.includes('encrypted-') && (
                      <div><strong>Hash:</strong> <code className="bg-gray-100 px-1 rounded">{result.hash}</code></div>
                    )}
                    <div><strong>Encrypted:</strong> {result.encrypted ? '🔐 Yes' : '🌐 No'}</div>
                  </div>

                  {result.note && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        ℹ️ <strong>Note:</strong> {result.note}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {result.encrypted ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <p className="text-sm text-amber-800">
                            🔐 <strong>Encrypted File:</strong> This file is private and cannot be viewed publicly on IPFS.
                            Only you can decrypt it with your wallet.
                          </p>
                        </div>

                        {isConnected ? (
                          <button
                            onClick={() => handleDecrypt(result.hash, result.filename?.includes('.') ?
                              `image/${result.filename.split('.').pop()?.toLowerCase()}` : 'image/jpeg')}
                            disabled={decrypting}
                            className="w-full py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {decrypting ? '🔓 Decrypting...' : '🔓 Decrypt & View File'}
                          </button>
                        ) : (
                          <div className="p-2 bg-gray-100 rounded-md text-center text-sm text-gray-600">
                            Connect your wallet to decrypt this file
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <a
                          href={result.gateway_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full py-2 px-4 bg-green-600 text-white text-center rounded-md hover:bg-green-700"
                        >
                          View on IPFS Gateway
                        </a>

                        {/* Show image preview if it's an unencrypted image */}
                        {result.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                          <div className="mt-4">
                            <h4 className="font-semibold mb-2">Preview:</h4>
                            <img
                              src={result.gateway_url}
                              alt={result.filename}
                              className="max-w-full h-auto max-h-64 rounded border"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </>
                    )}

                    <a
                      href={`/view-file/${result.hash}`}
                      className="block w-full py-2 px-4 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700"
                    >
                      View in App
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-red-600">
                  <strong>Error:</strong> {result.error}
                </div>
              )}

              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600">Raw Response</summary>
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto mt-2">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}