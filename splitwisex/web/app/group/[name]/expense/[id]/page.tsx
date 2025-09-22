'use client'
import { useParams } from 'next/navigation'
import { useSubgraph } from '@/hooks/useSubgraph'
import { GET_EXPENSE_BY_ID, GET_GROUP_BY_NAME } from '@/lib/queries'
import ENSName from '@/components/ENSName'
import { ipfsGateway } from '@/lib/ipfs'
import Link from 'next/link'

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


  // Get group data
  const { data: groupData } = useSubgraph<any>(GET_GROUP_BY_NAME(groupName), [groupName])
  const group = groupData?.groups?.[0]

  // Get expense data
  const { data: expenseData, loading, error } = useSubgraph<any>(GET_EXPENSE_BY_ID(expenseId), [expenseId])
  const expense = expenseData?.expenses?.[0]

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error loading expense: {error.message}</div>
  if (!expense) return <div>Expense not found</div>

  const totalAmount = getUSDValue(expense.amount, expense.token)
  const memberCount = group?.members?.length || 1
  const sharePerMember = totalAmount / memberCount

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
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-medium">
                      {member.ensName?.charAt(0).toUpperCase() || member.id.slice(2, 4).toUpperCase()}
                    </span>
                  </div>
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
            {(() => {
              const imageUrl = ipfsGateway(expense.cid)
              const fallbackUrl = ipfsGateway(expense.cid, true)
              console.log('Receipt CID:', expense.cid)
              console.log('Generated image URL:', imageUrl)
              console.log('Fallback image URL:', fallbackUrl)

              return (
                <img
                  src={imageUrl}
                  alt="Receipt"
                  className="w-full rounded-lg shadow-sm"
                  onLoad={() => console.log('Image loaded successfully:', imageUrl)}
                  onError={(e) => {
                    console.error('Image failed to load:', imageUrl)
                    console.log('Trying fallback URL:', fallbackUrl)
                    e.currentTarget.src = fallbackUrl
                  }}
                />
              )
            })()}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 mt-auto">
        <button className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold">
          Delete expense
        </button>
      </div>
    </div>
  )
}