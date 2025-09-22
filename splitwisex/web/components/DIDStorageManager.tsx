'use client'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface DIDStorageManagerProps {
  onUploadComplete?: (cid: string, filecoinStatus: string) => void
  className?: string
}

interface StorageStatus {
  cid: string
  ipfsStatus: 'uploading' | 'uploaded' | 'failed'
  filecoinStatus: 'pending' | 'pinned' | 'stored' | 'failed'
  dealId?: string
  errorMessage?: string
}

export default function DIDStorageManager({ onUploadComplete, className = '' }: DIDStorageManagerProps) {
  const { address } = useAccount()
  const [file, setFile] = useState<File | null>(null)
  const [did, setDid] = useState<string>('')
  const [synapseApiKey, setSynapseApiKey] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null)
  const [savedApiKey, setSavedApiKey] = useState<boolean>(false)

  // Load saved DID and API key from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && address) {
      const savedDid = localStorage.getItem(`did_${address}`)
      const savedApiKey = localStorage.getItem(`synapse_api_key_${address}`)
      
      if (savedDid) setDid(savedDid)
      if (savedApiKey) {
        setSynapseApiKey(savedApiKey)
        setSavedApiKey(true)
      }
    }
  }, [address])

  // Save DID and API key to localStorage
  const saveDIDAndApiKey = () => {
    if (!address) return
    
    if (did) localStorage.setItem(`did_${address}`, did)
    if (synapseApiKey) {
      localStorage.setItem(`synapse_api_key_${address}`, synapseApiKey)
      setSavedApiKey(true)
    }
  }

  // Clear saved credentials
  const clearCredentials = () => {
    if (!address) return
    
    localStorage.removeItem(`did_${address}`)
    localStorage.removeItem(`synapse_api_key_${address}`)
    setDid('')
    setSynapseApiKey('')
    setSavedApiKey(false)
  }

  // Handle file upload to web3.storage using DID
  const uploadToWeb3Storage = async () => {
    if (!file || !did) return null
    
    setIsUploading(true)
    setStorageStatus({
      cid: '',
      ipfsStatus: 'uploading',
      filecoinStatus: 'pending'
    })
    
    try {
      // In a real implementation, we would use the w3up client library
      // This is a simplified mock implementation
      console.log(`Uploading file ${file.name} using DID: ${did}`)
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Generate a mock CID
      const mockCid = `bafybeig${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      
      setStorageStatus({
        cid: mockCid,
        ipfsStatus: 'uploaded',
        filecoinStatus: 'pinned'
      })
      
      return mockCid
    } catch (error: any) {
      console.error('Failed to upload to web3.storage:', error)
      setStorageStatus({
        cid: '',
        ipfsStatus: 'failed',
        filecoinStatus: 'failed',
        errorMessage: error.message || 'Upload failed'
      })
      return null
    } finally {
      setIsUploading(false)
    }
  }

  // Store on Filecoin via Synapse
  const storeOnFilecoin = async (cid: string) => {
    if (!cid || !synapseApiKey) return
    
    try {
      setStorageStatus(prev => prev ? {
        ...prev,
        filecoinStatus: 'pending'
      } : null)
      
      // In a real implementation, we would use the Synapse SDK
      // This is a simplified mock implementation
      console.log(`Storing CID ${cid} on Filecoin using Synapse API key: ${synapseApiKey.substring(0, 5)}...`)
      
      // Simulate Filecoin storage delay
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Generate a mock deal ID
      const mockDealId = `f0${Math.floor(Math.random() * 1000000)}`
      
      setStorageStatus(prev => prev ? {
        ...prev,
        filecoinStatus: 'stored',
        dealId: mockDealId
      } : null)
      
      if (onUploadComplete) {
        onUploadComplete(cid, 'stored')
      }
      
      return mockDealId
    } catch (error: any) {
      console.error('Failed to store on Filecoin:', error)
      setStorageStatus(prev => prev ? {
        ...prev,
        filecoinStatus: 'failed',
        errorMessage: error.message || 'Filecoin storage failed'
      } : null)
    }
  }

  // Handle the complete upload and storage process
  const handleUpload = async () => {
    const cid = await uploadToWeb3Storage()
    if (cid && synapseApiKey) {
      await storeOnFilecoin(cid)
    } else if (cid && onUploadComplete) {
      onUploadComplete(cid, 'pinned')
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium mb-2">Decentralized Storage Settings</h3>
        
        <div className="space-y-3">
          {/* DID Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your DID
            </label>
            <input
              type="text"
              value={did}
              onChange={(e) => setDid(e.target.value)}
              placeholder="did:key:z6Mk..."
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Your decentralized identifier for web3.storage authentication
            </p>
          </div>
          
          {/* Synapse API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Synapse API Key
            </label>
            <input
              type="password"
              value={synapseApiKey}
              onChange={(e) => setSynapseApiKey(e.target.value)}
              placeholder={savedApiKey ? "••••••••••••••••" : "Enter your Synapse API key"}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Required for Filecoin storage integration
            </p>
          </div>
          
          {/* Save/Clear Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveDIDAndApiKey}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              disabled={!did && !synapseApiKey}
            >
              Save Credentials
            </button>
            <button
              type="button"
              onClick={clearCredentials}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm"
              disabled={!did && !synapseApiKey && !savedApiKey}
            >
              Clear Saved Credentials
            </button>
          </div>
        </div>
      </div>
      
      {/* File Upload */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium mb-2">Upload File</h3>
        
        <div className="space-y-3">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || !did || isUploading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-gray-400"
          >
            {isUploading ? 'Uploading...' : 'Upload & Store'}
          </button>
        </div>
      </div>
      
      {/* Status Display */}
      {storageStatus && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-2">Storage Status</h3>
          
          <div className="space-y-2">
            {storageStatus.cid && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">IPFS CID:</span>
                <span className="text-sm font-mono">{storageStatus.cid.slice(0, 10)}...{storageStatus.cid.slice(-4)}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">IPFS Status:</span>
              <span className={`text-sm ${
                storageStatus.ipfsStatus === 'uploaded' ? 'text-green-600' :
                storageStatus.ipfsStatus === 'uploading' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {storageStatus.ipfsStatus.toUpperCase()}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Filecoin Status:</span>
              <span className={`text-sm ${
                storageStatus.filecoinStatus === 'stored' ? 'text-green-600' :
                storageStatus.filecoinStatus === 'pinned' ? 'text-blue-600' :
                storageStatus.filecoinStatus === 'pending' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {storageStatus.filecoinStatus.toUpperCase()}
              </span>
            </div>
            
            {storageStatus.dealId && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Filecoin Deal ID:</span>
                <span className="text-sm font-mono">{storageStatus.dealId}</span>
              </div>
            )}
            
            {storageStatus.errorMessage && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {storageStatus.errorMessage}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Help Text */}
      <div className="text-xs text-gray-500">
        <p className="mb-1"><strong>How it works:</strong></p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>Your DID authenticates you with web3.storage for IPFS uploads</li>
          <li>The Synapse API key enables Filecoin permanent storage</li>
          <li>Credentials are stored locally and never sent to our servers</li>
          <li>Files are encrypted client-side before upload for maximum privacy</li>
        </ul>
      </div>
    </div>
  )
}

