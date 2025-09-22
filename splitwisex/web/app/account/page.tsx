'use client'
import { useAccount, useEnsName, useBalance } from 'wagmi'
import Link from 'next/link'
import { useState } from 'react'

export default function AccountPage() {
  const { address, isConnected } = useAccount()
  const { data: ensName } = useEnsName({ address })
  const { data: balanceData } = useBalance({ address })
  
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="p-4 bg-emerald-600 text-white">
        <h1 className="text-xl font-semibold">Account</h1>
      </div>
      
      {/* Account Info */}
      <div className="p-4 flex-1">
        {!isConnected ? (
          <div className="text-center py-8">
            <p className="mb-4">Connect your wallet to view your account</p>
            <button className="px-4 py-2 bg-emerald-600 text-white rounded-md">
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {address ? address.substring(2, 4).toUpperCase() : '??'}
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h2 className="text-lg font-medium mb-4">Wallet Information</h2>
              
              <div className="space-y-3">
                {ensName && (
                  <div>
                    <div className="text-sm text-gray-500">ENS Name</div>
                    <div className="font-medium">{ensName}</div>
                  </div>
                )}
                
                <div>
                  <div className="text-sm text-gray-500">Wallet Address</div>
                  <div className="font-mono text-sm break-all">
                    {address}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">Balance</div>
                  <div className="font-medium">
                    {balanceData ? (
                      <>
                        {parseFloat(balanceData.formatted).toFixed(4)} {balanceData.symbol}
                      </>
                    ) : (
                      'Loading...'
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h2 className="text-lg font-medium mb-4">Settings</h2>
              
              <div className="space-y-2">
                <button className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-md flex justify-between items-center">
                  <span>Notifications</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <button className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-md flex justify-between items-center">
                  <span>Privacy</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <button className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-md flex justify-between items-center">
                  <span>Security</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="mt-4">
              <button className="w-full py-3 bg-red-100 text-red-600 font-medium rounded-md">
                Disconnect Wallet
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-2">
        <div className="flex justify-around items-center">
          <Link href="/" className="flex flex-col items-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">Groups</span>
          </Link>
          <Link href="/activity" className="flex flex-col items-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs">Activity</span>
          </Link>
          <Link href="/account" className="flex flex-col items-center text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs">Account</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
