'use client'
import { useParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'

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

const mockDebts = [
  {
    id: '1',
    debtor: { id: '0x2345678901234567890123456789012345678901' },
    creditor: { id: '0x1234567890123456789012345678901234567890' },
    amount: '16666666666666666666', // ~16.67 ETH
    token: '0x0000000000000000000000000000000000000000'
  },
  {
    id: '2',
    debtor: { id: '0x3456789012345678901234567890123456789012' },
    creditor: { id: '0x1234567890123456789012345678901234567890' },
    amount: '333333333', // ~333 USDC
    token: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238'
  }
]

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

// Helper function to convert token to INR (approximate rates)
const getINRValue = (amount: string, tokenAddress: string): string => {
  const token = TOKEN_INFO[tokenAddress.toLowerCase()] || { symbol: 'TOKEN', decimals: 18 }
  const amountNum = Number(amount) / Math.pow(10, token.decimals)

  // Approximate exchange rates
  const rates: { [key: string]: number } = {
    'ETH': 275000, // 1 ETH ≈ ₹2,75,000
    'USDC': 84,    // 1 USDC ≈ ₹84
    'TOKEN': 84    // Default to USDC rate
  }

  const rate = rates[token.symbol] || rates['TOKEN']
  const inrValue = amountNum * rate

  return `≈₹${inrValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export default function BalancesPage() {
  const router = useRouter()
  const params = useParams<{ name: string }>()
  const name = decodeURIComponent(params.name)
  const { address: userAddress } = useAccount()

  // Get mock data
  const group = mockGroups[name] || Object.values(mockGroups)[0]

  // Calculate balances
  interface DebtEdge {
    id: string
    debtor: { id: string }
    creditor: { id: string }
    amount: string
    token: string
  }

  const edges = mockDebts as DebtEdge[]
  const owedToMe = edges.filter(e => e.creditor.id.toLowerCase() === userAddress?.toLowerCase())

  const g = group
  if (!g) {
    return (
      <div>
        <div>Group not found</div>
        <div className="text-sm text-gray-600 mt-2">
          Looking for group name: {name}
        </div>
        <div className="text-sm text-gray-600">
          Available groups: {Object.keys(mockGroups).join(', ')}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-blue-900 to-blue-800 text-white">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-800/50 to-blue-900/50 backdrop-blur-xl"></div>
        <div className="relative">
          {/* Top Navigation */}
          <div className="flex items-center justify-between p-4">
            <button onClick={() => router.push(`/group/${name}`)} className="p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold">Balances</h1>
            <div className="w-10"></div>
          </div>

          {/* Group Info */}
          <div className="px-4 pb-6 pt-2">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{g.name || `Group #${g.id}`}</h2>
                <p className="text-white/70">Individual balances</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {owedToMe.length > 0 ? (
            owedToMe.map((debt) => (
              <div key={debt.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {debt.debtor.id.slice(2, 4).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-lg">
                        <ENSName address={debt.debtor.id} />
                      </div>
                      <div className="text-sm text-gray-500">
                        owes you
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-600 font-semibold text-lg">
                      {formatTokenAmount(debt.amount, debt.token)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {getINRValue(debt.amount, debt.token)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">All settled up!</h3>
              <p className="text-gray-500">No one owes you money in this group.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}