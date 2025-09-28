'use client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { useState } from 'react'

// Mock data
const mockGroups: { [name: string]: any } = {
  'Weekend Trip': {
    id: '1',
    name: 'Weekend Trip',
    members: [
      { id: '0x1234567890123456789012345678901234567890', ensName: 'alice.eth' },
      { id: '0x2345678901234567890123456789012345678901', ensName: 'bob.eth' },
      { id: '0x3456789012345678901234567890123456789012', ensName: 'charlie.eth' },
    ]
  }
}

const mockExpenses: { [id: string]: any } = {
  '1': {
    id: '1',
    payer: { id: '0x1234567890123456789012345678901234567890' },
    amount: '50000000000000000000', // 50 ETH in wei
    token: '0x0000000000000000000000000000000000000000',
    memo: 'Dinner at restaurant',
    createdAt: '1703980800',
    cid: null
  },
  '2': {
    id: '2',
    payer: { id: '0x2345678901234567890123456789012345678901' },
    amount: '1000000000', // 1000 USDC
    token: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
    memo: 'Gas for trip',
    createdAt: '1703894400',
    cid: null
  }
}

// Mock ENS component
const ENSName = ({ address }: { address: string }) => {
  const mockNames: { [key: string]: string } = {
    '0x1234567890123456789012345678901234567890': 'alice.eth',
    '0x2345678901234567890123456789012345678901': 'bob.eth',
    '0x3456789012345678901234567890123456789012': 'charlie.eth'
  }
  return <span>{mockNames[address] || `${address.slice(0, 6)}...${address.slice(-4)}`}</span>
}

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

// Helper function to get USD value
const getUSDValue = (amount: string, tokenAddress: string): number => {
  const token = TOKEN_INFO[tokenAddress.toLowerCase()] || { symbol: 'TOKEN', decimals: 18 }
  const amountNum = Number(amount) / Math.pow(10, token.decimals)

  if (token.symbol === 'ETH') {
    return amountNum * 3300
  } else if (token.symbol === 'USDC') {
    return amountNum
  }

  return amountNum
}

// Format date function
const formatDate = (timestamp: string | number) => {
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default function ExpenseDetailsPage() {
  const params = useParams<{ name: string; id: string }>()
  const groupName = params?.name ? decodeURIComponent(params.name) : ''
  const expenseId = params?.id || ''
  const router = useRouter()
  const { address: userAddress } = useAccount()
  const [isDeleting, setIsDeleting] = useState(false)

  // Get mock data
  const group = mockGroups[groupName] || Object.values(mockGroups)[0]
  const expense = mockExpenses[expenseId] || Object.values(mockExpenses)[0]

  if (!expense) return <div>Expense not found</div>

  const totalAmount = getUSDValue(expense.amount, expense.token)
  const memberCount = group?.members?.length || 1
  const sharePerMember = totalAmount / memberCount

  // Check if current user is the payer
  const isUserPayer = expense.payer.id.toLowerCase() === userAddress?.toLowerCase()

  const handleDeleteExpense = async () => {
    if (!userAddress || !isUserPayer) {
      alert('Only the person who paid can delete this expense')
      return
    }

    const confirmDelete = window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      // Mock delete - in real app this would call smart contract
      console.log('Mock: Deleting expense', expenseId)
      alert('✅ Expense deleted successfully!')

      // Navigate back to group page
      router.push(`/group/${encodeURIComponent(groupName)}`)
    } catch (error: any) {
      console.error('Failed to delete expense:', error)
      alert(`Failed to delete expense: ${error.message || 'Unknown error'}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center">
        <Link href={`/group/${params?.name}`} className="mr-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold">Expense details</h1>
      </div>

      {/* Expense Summary */}
      <div className="bg-white mx-4 mt-4 rounded-lg p-4 shadow-sm">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold">{expense.memo || 'Expense'}</h2>
          <p className="text-gray-600">{formatDate(expense.createdAt)}</p>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-gray-800">
            {formatTokenAmount(expense.amount, expense.token)}
          </div>
          <div className="text-lg text-gray-600">
            ≈ ${totalAmount.toFixed(2)} USD
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Paid by</span>
            <ENSName address={expense.payer.id} />
          </div>
        </div>
      </div>

      {/* Split Details */}
      <div className="bg-white mx-4 mt-4 rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Split details</h3>
          <p className="text-sm text-gray-600">Split equally between {memberCount} people</p>
        </div>

        <div className="divide-y">
          {group?.members?.map((member: any) => {
            const isPayer = member.id.toLowerCase() === expense.payer.id.toLowerCase()

            return (
              <div key={member.id} className="p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <ENSName address={member.id} />
                </div>

                <div className="text-right">
                  {isPayer ? (
                    <div>
                      <div className="text-sm text-gray-600">paid ${totalAmount.toFixed(2)}</div>
                      <div className="text-sm text-green-600">gets back ${(totalAmount - sharePerMember).toFixed(2)}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-orange-600">
                      owes ${sharePerMember.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Receipt */}
      {expense.cid && (
        <div className="bg-white mx-4 mt-4 rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Receipt</h3>
          </div>

          <div className="p-4">
            <div className="bg-gray-100 p-8 rounded-lg text-center text-gray-500">
              Receipt image placeholder
              <br />
              <small>CID: {expense.cid}</small>
            </div>
          </div>
        </div>
      )}

      {/* Actions - Only show delete button to the person who paid */}
      {isUserPayer && (
        <div className="p-4 mt-auto">
          <button
            onClick={handleDeleteExpense}
            disabled={isDeleting}
            className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
          >
            {isDeleting ? 'Deleting...' : 'Delete expense'}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Only you can delete this expense since you paid for it
          </p>
        </div>
      )}
    </div>
  )
}