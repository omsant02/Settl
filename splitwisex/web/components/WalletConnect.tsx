'use client'
import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import ENSName from './ENSName'

export default function WalletConnect() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Could add a toast notification here
      console.log('Address copied to clipboard')
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg">
        <span className="text-sm font-medium">Loading...</span>
      </div>
    )
  }

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-sm font-medium">
            <ENSName address={address} />
          </span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20">
              <div className="p-3 border-b">
                <div className="text-xs text-gray-500">Connected</div>
                <div className="text-sm font-medium">
                  <ENSName address={address} />
                </div>
                <div className="text-xs text-gray-400 mt-1">{formatAddress(address)}</div>
              </div>
              <div className="p-1">
                <button
                  onClick={() => {
                    copyToClipboard(address)
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy wallet address
                </button>
                <button
                  onClick={() => {
                    disconnect()
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Disconnect
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
        </svg>
        <span className="text-sm font-medium">Connect Wallet</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20">
            <div className="p-3 border-b">
              <h3 className="text-sm font-semibold text-gray-900">Connect Wallet</h3>
              <p className="text-xs text-gray-500 mt-1">Choose how you want to connect</p>
            </div>
            <div className="p-1">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => {
                    connect({ connector })
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors flex items-center gap-3"
                >
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">
                      {connector.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{connector.name}</div>
                    <div className="text-xs text-emerald-600">
                      {connector.ready ? 'Ready' : 'Click to connect'}
                    </div>
                  </div>
                </button>
              ))}

              {/* Fallback message if no connectors */}
              {connectors.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No wallet connectors available
                </div>
              )}
            </div>
            <div className="p-3 border-t bg-gray-50 rounded-b-lg">
              <p className="text-xs text-gray-500">
                New to Ethereum? <a href="https://ethereum.org/wallets/" target="_blank" className="text-blue-600 hover:underline">Learn about wallets</a>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}