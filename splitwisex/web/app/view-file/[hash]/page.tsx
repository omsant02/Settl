'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

interface FileInfo {
  success: boolean
  hash?: string
  gateway_url?: string
  ipfs_url?: string
  error?: string
  fileInfo?: {
    fileSizeInBytes: string
    fileName: string
    mimeType: string
    encryption: boolean
    txHash: string
    fileSizeFormatted: string
  }
}

export default function ViewFile() {
  const params = useParams()
  const hash = params?.hash as string
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (hash) {
      fetchFileInfo()
    }
  }, [hash])

  const fetchFileInfo = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/lighthouse/file/${hash}`)
      const data = await response.json()
      setFileInfo(data)
    } catch (error) {
      console.error('Failed to fetch file info:', error)
      setFileInfo({ success: false, error: 'Failed to fetch file info' })
    } finally {
      setLoading(false)
    }
  }

  const getFileType = (mimeType?: string): 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'unknown' => {
    if (!mimeType) return 'unknown'

    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType === 'application/pdf') return 'pdf'
    if (mimeType.startsWith('text/')) return 'text'

    return 'unknown'
  }

  const renderFileContent = () => {
    if (!fileInfo?.success || !fileInfo.gateway_url) return null

    const fileType = getFileType(fileInfo?.fileInfo?.mimeType)

    switch (fileType) {
      case 'image':
        return (
          <div className="text-center">
            <img
              src={fileInfo.gateway_url}
              alt={`File ${hash}`}
              className="max-w-full h-auto max-h-96 mx-auto rounded border shadow-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                const errorDiv = document.createElement('div')
                errorDiv.className = 'text-red-600 p-4'
                errorDiv.textContent = 'Failed to load image'
                e.currentTarget.parentNode?.appendChild(errorDiv)
              }}
            />
          </div>
        )

      case 'video':
        return (
          <video controls className="max-w-full h-auto mx-auto">
            <source src={fileInfo.gateway_url} />
            Your browser does not support the video tag.
          </video>
        )

      case 'audio':
        return (
          <audio controls className="w-full">
            <source src={fileInfo.gateway_url} />
            Your browser does not support the audio tag.
          </audio>
        )

      case 'pdf':
        return (
          <iframe
            src={fileInfo.gateway_url}
            className="w-full h-96 border rounded"
            title={`PDF ${hash}`}
          />
        )

      default:
        return (
          <div className="text-center p-8 bg-gray-50 rounded">
            <p className="text-gray-600 mb-4">File preview not available</p>
            <a
              href={fileInfo.gateway_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Download file
            </a>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading file...</p>
        </div>
      </div>
    )
  }

  if (!fileInfo?.success) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">File Not Found</h2>
            <p className="text-red-600">{fileInfo?.error || 'Unable to load file'}</p>
            <a
              href="/upload-lighthouse"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Upload a file
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">File Viewer</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Hash: <code className="bg-gray-100 px-2 py-1 rounded">{hash}</code></span>
            </div>
          </div>

          <div className="mb-6">
            {renderFileContent()}
          </div>

          {/* File Info Section */}
          {fileInfo?.fileInfo && (
            <div className="mb-6 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                💁 File Info
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">File Name</label>
                    <p className="text-sm text-gray-900 break-all">{fileInfo.fileInfo.fileName || 'Unknown'}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">File Size</label>
                    <p className="text-sm text-gray-900">
                      {fileInfo.fileInfo.fileSizeFormatted}
                      <span className="text-gray-500 ml-1">({parseInt(fileInfo.fileInfo.fileSizeInBytes).toLocaleString()} bytes)</span>
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">MIME Type</label>
                    <p className="text-sm text-gray-900 font-mono bg-white px-2 py-1 rounded border">{fileInfo.fileInfo.mimeType}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Encryption</label>
                    <p className="text-sm">
                      {fileInfo.fileInfo.encryption ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          Encrypted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 1C4.477 1 0 5.477 0 11s4.477 10 10 10 10-4.477 10-10S15.523 1 10 1zM8 11a1 1 0 100-2 1 1 0 000 2zm4 0a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                          Not Encrypted
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">IPFS CID</label>
                    <p className="text-sm text-gray-900 font-mono bg-white px-2 py-1 rounded border break-all">{hash}</p>
                  </div>

                  {fileInfo.fileInfo.txHash && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Transaction Hash</label>
                      <p className="text-sm text-gray-900 font-mono bg-white px-2 py-1 rounded border break-all">
                        {fileInfo.fileInfo.txHash || 'Not available'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">File Links</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={fileInfo.gateway_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in IPFS Gateway
              </a>

              <button
                onClick={() => navigator.clipboard.writeText(fileInfo.gateway_url || '')}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </button>
            </div>
          </div>

          <div className="border-t pt-6 mt-6">
            <a
              href="/upload-lighthouse"
              className="text-blue-600 hover:underline"
            >
              ← Upload another file
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}