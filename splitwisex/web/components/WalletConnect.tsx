'use client'
import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function WalletConnect() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg">
        <span className="text-sm font-medium">Loading...</span>
      </div>
    )
  }

  return (
    <ConnectButton 
      showBalance={false}
      chainStatus="icon"
      accountStatus="address"
    />
  )
}