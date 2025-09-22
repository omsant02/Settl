'use client'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
// Simplified settings - no longer using secure storage
import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [hasStorageCredentials, setHasStorageCredentials] = useState(false)
  
  // Check if user has storage credentials
  useEffect(() => {
    if (isConnected && address) {
      // Simplified - always assume credentials are available now
      setHasStorageCredentials(true)
    }
  }, [isConnected, address])
  
  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-6">Settings</h1>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-yellow-700">Please connect your wallet to access settings.</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      
      <div className="space-y-6">
        {/* Account Settings */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="text-lg font-medium">Account</h2>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {address ? address.slice(2, 4).toUpperCase() : '??'}
              </div>
              <div>
                <div className="font-medium">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}</div>
                <div className="text-sm text-gray-500">Connected Wallet</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Storage Settings */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="text-lg font-medium">Decentralized Storage</h2>
          </div>
          <div className="p-4">
            <Link 
              href="/settings/did"
              className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">DID & Storage Settings</div>
                  <div className="text-sm text-gray-500">Manage your decentralized identity and storage</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasStorageCredentials && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Configured
                  </span>
                )}
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </div>
        
        {/* Privacy Settings */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="text-lg font-medium">Privacy & Security</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Receipt Encryption</div>
                <div className="text-sm text-gray-500">Automatically encrypt receipts before uploading</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Filecoin Storage</div>
                <div className="text-sm text-gray-500">Store receipts permanently on Filecoin</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
        
        {/* About */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="text-lg font-medium">About</h2>
          </div>
          <div className="p-4">
            <div className="text-sm text-gray-600">
              <p className="mb-2">
                <strong>SplitwiseX</strong> with decentralized storage integration.
              </p>
              <p>
                Version 1.0.0 • Built with web3.storage & Synapse
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

