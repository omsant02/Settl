'use client'
import { useSubgraph } from '@/hooks/useSubgraph'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import ENSName from '@/components/ENSName'
import { ipfsGateway } from '@/lib/ipfs'

// Token configurations for display
const TOKEN_INFO: { [address: string]: { symbol: string; decimals: number } } = {
  '0x0000000000000000000000000000000000000000': { symbol: 'ETH', decimals: 18 },
  '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': { symbol: 'USDC', decimals: 6 }
}

// Helper function to format token amounts
const formatTokenAmount = (amount: string, tokenAddress: string): string => {
  const token = TOKEN_INFO[tokenAddress.toLowerCase()] || { symbol: 'TOKEN', decimals: 18 }
  const amountNum = Number(amount) / Math.pow(10, token.decimals)
  return token.symbol === 'ETH'
    ? `${amountNum.toFixed(6)} ${token.symbol}`
    : `${amountNum.toFixed(2)} ${token.symbol}`
}

// Format date function
const formatDate = (timestamp: string | number) => {
  const date = new Date(Number(timestamp) * 1000)
  const month = date.toLocaleString('default', { month: 'short' })
  const day = date.getDate()
  const year = date.getFullYear()
  
  return { month, day, year }
}

export default function ActivityPage() {
  const { address } = useAccount()
  
  // Get all expenses involving the current user
  const { data: expensesData, loading } = useSubgraph<any>(
    address ? 
    `query GetUserExpenses($address: String!) {
      expenses(
        where: {OR: [{payer: $address}, {splits_: {member: $address}}]},
        orderBy: createdAt,
        orderDirection: desc
      ) {
        id
        amount
        token
        memo
        createdAt
        cid
        group {
          id
          name
        }
        payer {
          id
        }
        splits {
          member {
            id
          }
          amount
        }
      }
    }` : '',
    address ? [{ address: address?.toLowerCase() }] : []
  )

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="p-4 bg-emerald-600 text-white">
          <h1 className="text-xl font-semibold">Activity</h1>
        </div>
        <div className="p-4 flex-1">
          <div className="text-center py-8">Loading activity...</div>
        </div>
      </div>
    )
  }
  
  // Define expense type for TypeScript
  interface Expense {
    id: string
    payer: { id: string }
    amount: string
    token: string
    memo: string
    createdAt: string
    cid: string
    group: { id: string; name: string }
    splits: Array<{ member: { id: string }; amount: string }>
  }
  
  const expenses = expensesData?.expenses || []
  
  // Group expenses by month/year
  const expensesByDate: Record<string, Expense[]> = {}
  expenses.forEach((ex: Expense) => {
    const timestamp = ex.createdAt
    const date = formatDate(timestamp)
    const key = `${date.month} ${date.year}`
    
    if (!expensesByDate[key]) {
      expensesByDate[key] = []
    }
    expensesByDate[key].push(ex)
  })

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="p-4 bg-emerald-600 text-white">
        <h1 className="text-xl font-semibold">Activity</h1>
      </div>
      
      {/* Activity Feed */}
      <div className="p-4 flex-1">
        {Object.keys(expensesByDate).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No activity yet</p>
          </div>
        ) : (
          <div>
            {Object.keys(expensesByDate).map(monthYear => (
              <div key={monthYear} className="mb-6">
                {/* Month header */}
                <h2 className="text-lg font-semibold text-gray-500 mb-2">{monthYear}</h2>
                
                {/* Expenses for this month */}
                <div className="space-y-4">
                  {expensesByDate[monthYear].map((ex: Expense) => {
                    const date = formatDate(ex.createdAt)
                    const isPayer = ex.payer.id.toLowerCase() === address?.toLowerCase()
                    
                    return (
                      <Link key={ex.id} href={`/group/${encodeURIComponent(ex.group.name || ex.group.id)}/expense/${ex.id}`}>
                        <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          {/* Date */}
                          <div className="text-center">
                            <div className="text-gray-500">{date.month}</div>
                            <div className="text-2xl font-semibold">{String(date.day).padStart(2, '0')}</div>
                          </div>
                          
                          {/* Transaction details */}
                          <div className="flex-1">
                            <div className="font-medium">{ex.memo || 'Expense'}</div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">{ex.group.name || `Group #${ex.group.id}`}</span>
                              {' '} • {' '}
                              {isPayer ? 'You' : <ENSName address={ex.payer.id} />} paid {formatTokenAmount(ex.amount, ex.token)}
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
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
          <Link href="/activity" className="flex flex-col items-center text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs">Activity</span>
          </Link>
          <Link href="/account" className="flex flex-col items-center text-gray-400">
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
