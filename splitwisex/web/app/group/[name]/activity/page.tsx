'use client'
import { useParams, useRouter } from 'next/navigation'
import { useSubgraph } from '@/hooks/useSubgraph'
import { GET_GROUP_BY_NAME, GET_EXPENSES } from '@/lib/queries'
import ENSName from '@/components/ENSName'
import { ipfsGateway } from '@/lib/ipfs'
import { useAccount } from 'wagmi'

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

export default function ActivityPage() {
  const router = useRouter()
  const params = useParams<{ name: string }>()
  const name = params?.name ? decodeURIComponent(params.name) : ''
  const { address: userAddress } = useAccount()
  const { data, loading, error } = useSubgraph<any>(GET_GROUP_BY_NAME(name), [name])

  const group = data?.groups?.[0]
  const groupId = group?.id

  const { data: expensesData, loading: expensesLoading } = useSubgraph<any>(GET_EXPENSES(groupId || ''), [groupId])

  if (loading) return <div>Loading...</div>

  if (error) {
    console.error('GraphQL Error:', error)
    return <div>Error loading group: {error.message}</div>
  }

  if (!group) {
    return (
      <div className="p-4">
        <div>Group not found</div>
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
            <button onClick={() => router.back()} className="p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-medium">Activity</h1>
            <button className="p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Group Info */}
          <div className="px-4 pb-6 pt-2">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{group.name || `Group #${group.id}`}</h2>
                <p className="text-blue-100">All expenses and activities</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Content */}
      <div className="flex-1 overflow-auto">
        {expensesLoading ? (
          <div className="p-4 text-center">Loading activities...</div>
        ) : expensesData?.expenses?.length > 0 ? (
          (Object.entries(
            expensesData.expenses.reduce((acc: { [key: string]: any[] }, ex: any) => {
              const date = new Date(parseInt(ex.createdAt) * 1000)
              const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' })
              if (!acc[monthYear]) acc[monthYear] = []
              acc[monthYear].push(ex)
              return acc
            }, {} as { [key: string]: any[] })
          ) as [string, any[]][]).map(([monthYear, expenses]) => (
            <div key={monthYear}>
              <div className="px-4 py-3 bg-gray-50 font-medium border-b">
                {monthYear}
              </div>
              <div className="divide-y">
                {expenses.map((ex: any) => {
                  const debtors = ex.debtors || []
                  const isDebtor = debtors.some((d: any) => d.id.toLowerCase() === userAddress?.toLowerCase())
                  const isPayer = ex.payer?.id?.toLowerCase() === userAddress?.toLowerCase()
                  const myShare = debtors.find((d: any) => d.id.toLowerCase() === userAddress?.toLowerCase())?.amount || '0'

                  return (
                    <div key={ex.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{ex.memo || 'No description'}</div>
                            <div className="text-right">
                              {isDebtor && !isPayer && (
                                <div className="text-orange-600 text-sm">
                                  you borrowed {formatTokenAmount(myShare, ex.token)}
                                </div>
                              )}
                              {isPayer && (
                                <div className="text-green-600 text-sm">
                                  you paid {formatTokenAmount(ex.amount, ex.token)}
                                </div>
                              )}
                              {!isDebtor && !isPayer && (
                                <div className="text-gray-500 text-sm">
                                  {formatTokenAmount(ex.amount, ex.token)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 mt-1 flex items-center justify-between">
                            <div>
                              <ENSName address={ex.payer?.id || ''} /> paid {formatTokenAmount(ex.amount, ex.token)}
                            </div>
                            <div className="text-xs">
                              {new Date(parseInt(ex.createdAt) * 1000).toLocaleDateString()}
                            </div>
                          </div>
                          {ex.cid && (() => {
                            // Try the fallback URL first for existing broken receipts
                            const receiptUrl = ipfsGateway(ex.cid)
                            console.log('Activity Receipt CID:', ex.cid)
                            console.log('Activity Receipt URL (with fix):', receiptUrl)
                            return (
                              <a
                                href={receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                View receipt
                              </a>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">No activity yet</h3>
            <p>Start by adding your first expense!</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <button
            onClick={() => router.push(`/group/${name}`)}
            className="flex flex-col items-center gap-1"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7z" />
            </svg>
            <span className="text-xs">Overview</span>
          </button>
          <button
            onClick={() => router.push(`/group/${name}/members`)}
            className="flex flex-col items-center gap-1"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs">People</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs text-green-600">Activity</span>
          </button>
        </div>
      </div>
    </div>
  )
}