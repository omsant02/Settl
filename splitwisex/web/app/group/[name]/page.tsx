'use client'
import { useParams } from 'next/navigation'
import { useSubgraph } from '@/hooks/useSubgraph'
import { GET_GROUP_BY_NAME, GET_EXPENSES, GET_DEBTS } from '@/lib/queries'
import ENSName from '@/components/ENSName'
import AddExpenseForm from '@/components/AddExpenseForm'
import { ipfsGateway } from '@/lib/ipfs'
import Link from 'next/link'
import { useState } from 'react'
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

// Helper function to get USD value
const getUSDValue = (amount: string, tokenAddress: string): number => {
  const token = TOKEN_INFO[tokenAddress.toLowerCase()] || { symbol: 'TOKEN', decimals: 18 }
  const amountNum = Number(amount) / Math.pow(10, token.decimals)
  
  // Convert to USD based on token
  if (token.symbol === 'ETH') {
    // Assuming ETH is worth $3300
    return amountNum * 3300
  } else if (token.symbol === 'USDC') {
    // USDC is pegged to USD
    return amountNum
  }
  
  return amountNum
}

// Format date function
const formatDate = (timestamp: string | number) => {
  const date = new Date(Number(timestamp) * 1000)
  const month = date.toLocaleString('default', { month: 'short' })
  const day = date.getDate()
  const year = date.getFullYear()
  
  return { month, day, year }
}

export default function GroupPage() {
  const params = useParams<{ name: string }>()
  const name = params?.name ? decodeURIComponent(params.name) : ''
  const { data, loading, error } = useSubgraph<any>(GET_GROUP_BY_NAME(name), [name])
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const { address: userAddress } = useAccount()

  // Define interface for group
  interface Group {
    id: string
    name: string
    members: Array<{ id: string, ensName?: string }>
  }
  
  // Define type for expense form
  interface GroupData {
    id: string
    name: string
    members: Array<{ id: string, ensName?: string }>
  }

  // Get the group ID from the fetched group data
  const groupData = data?.groups?.[0]
  const group: Group | undefined = groupData ? {
    id: groupData.id,
    name: groupData.name || `Group #${groupData.id}`,
    members: groupData.members || []
  } : undefined
  const groupId = group?.id

  const { data: expensesData, loading: expensesLoading } = useSubgraph<any>(GET_EXPENSES(groupId || ''), [groupId])
  const { data: debtsData, loading: debtsLoading } = useSubgraph<any>(GET_DEBTS(groupId || ''), [groupId])

  if (loading) return <div>Loading...</div>

  if (error) {
    console.error('GraphQL Error:', error)
    return <div>Error loading group: {error.message}</div>
  }

  const g = group
  if (!g) {
    return (
      <div>
        <div>Group not found</div>
        <div className="text-sm text-gray-600 mt-2">
          Looking for group name: {name}
        </div>
        <div className="text-sm text-gray-600">
          Query returned: {JSON.stringify(data, null, 2)}
        </div>
      </div>
    )
  }

  // Process debts data
  const debts = debtsData?.debtEdges || []
  const isAllSettledUp = debts.length === 0
  
  // Define debt type for TypeScript
  interface DebtEdge {
    id: string
    debtor: { id: string }
    creditor: { id: string }
    amount: string
    token: string
  }
  
  interface Creditor {
    address: string
    amount: number
    token: string
    usdValue: number
  }
  
  // Find debts relevant to the current user
  const myDebts = debts.filter((d: DebtEdge) => d.debtor.id.toLowerCase() === userAddress?.toLowerCase())
  const othersOweMe = debts.filter((d: DebtEdge) => d.creditor.id.toLowerCase() === userAddress?.toLowerCase())
  
  // Calculate net debt
  let netDebtAmount = 0
  let mainCreditor: any = null
  let mainCreditorAmount = 0
  
  if (myDebts.length > 0) {
    // Find the person I owe the most to
    const byCreditor = myDebts.reduce((acc: Record<string, Creditor>, debt: DebtEdge) => {
      const creditorId = debt.creditor.id
      if (!acc[creditorId]) {
        acc[creditorId] = {
          address: creditorId,
          amount: 0,
          token: debt.token,
          usdValue: 0
        }
      }
      
      const usdValue = getUSDValue(debt.amount, debt.token)
      acc[creditorId].usdValue += usdValue
      acc[creditorId].amount += Number(debt.amount)
      
      return acc
    }, {} as Record<string, Creditor>)
    
    // Find main creditor (who I owe the most to)
    const creditors = Object.values(byCreditor) as Creditor[]
    creditors.forEach((creditor) => {
      if (creditor.usdValue > mainCreditorAmount) {
        mainCreditor = creditor
        mainCreditorAmount = creditor.usdValue
      }
    })
    
    // Calculate total debt in USD
    netDebtAmount = myDebts.reduce((sum: number, debt: DebtEdge) => sum + getUSDValue(debt.amount, debt.token), 0)
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Group Header - Red background with icon and back button */}
      <div className="bg-red-900 text-white relative h-48">
        {/* Back button */}
        <div className="absolute top-4 left-4">
          <Link href="/" className="p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        </div>
        
        {/* Search button */}
        <div className="absolute top-4 right-12">
          <button className="p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
        
        {/* Settings button */}
        <div className="absolute top-4 right-4">
          <button className="p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        
        {/* Group icon */}
        <div className="absolute left-1/2 transform -translate-x-1/2 top-16">
          <div className="w-24 h-24 bg-white rounded-lg p-2 shadow-md flex items-center justify-center">
            <svg className="w-16 h-16 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Group Info */}
      <div className="flex-1 overflow-auto">
        {/* Group Name */}
        <div className="text-center mt-16 mb-2">
          <h1 className="text-2xl font-medium text-gray-800">{g.name || `Group #${g.id}`}</h1>
        </div>
        
        {/* Debt Summary */}
        <div className="text-center mb-6">
          {!isAllSettledUp ? (
            mainCreditor ? (
              <p className="text-lg">
                <ENSName address={mainCreditor?.address || ''} /> owes you
                <span className="text-emerald-500 font-semibold"> ${mainCreditorAmount.toFixed(2)}</span>
              </p>
            ) : othersOweMe.length > 0 ? (
              <p className="text-lg">
                <span className="text-lg">
                  <ENSName address={othersOweMe[0]?.debtor?.id || ''} /> owes you
                  <span className="text-emerald-500 font-semibold"> ${othersOweMe.length > 0 ? getUSDValue(othersOweMe[0]?.amount || '0', othersOweMe[0]?.token || '').toFixed(2) : '0.00'}</span>
                </span>
              </p>
            ) : (
              <p className="text-lg text-gray-600">No debts in this group</p>
            )
          ) : (
            <p className="text-lg text-green-600">All settled up!</p>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-between px-4 mb-8">
          <button className="bg-orange-500 text-white font-semibold py-3 px-6 rounded-md w-1/3">
            Settle up
          </button>
          <button className="border border-gray-300 text-gray-600 font-semibold py-3 px-6 rounded-md w-1/3 mx-2">
            Balances
          </button>
          <button className="border border-gray-300 text-gray-600 font-semibold py-3 px-6 rounded-md w-1/3">
            Totals
          </button>
          <button className="flex items-center justify-center ml-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
            </svg>
          </button>
        </div>
        
        {/* Transaction History */}
        <div className="px-4 mt-4">
        {expensesLoading ? (
          <div>Loading expenses...</div>
        ) : (
            <div>
              {expensesData?.expenses?.length > 0 ? (
                <>
                  {/* Group expenses by month/year */}
                  {(() => {
                    // Define expense type for TypeScript
                    interface Expense {
                      id: string
                      payer: { id: string }
                      amount: string
                      token: string
                      memo: string
                      createdAt: string
                      cid: string
                    }
                    
                    // Group expenses by month/year
                    const expensesByDate: Record<string, Expense[]> = {}
                    expensesData.expenses.forEach((ex: Expense) => {
                      const timestamp = ex.createdAt
                      const date = formatDate(timestamp)
                      const key = `${date.month} ${date.year}`
                      
                      if (!expensesByDate[key]) {
                        expensesByDate[key] = []
                      }
                      expensesByDate[key].push(ex)
                    })
                    
                    // Render expenses by month
                    return Object.keys(expensesByDate).map(monthYear => (
                      <div key={monthYear} className="mb-6">
                        {/* Month header */}
                        <h2 className="text-lg font-semibold text-gray-500 mb-2">{monthYear}</h2>
                        
                        {/* Expenses for this month */}
                        <div className="space-y-4">
                          {expensesByDate[monthYear].map((ex: any) => {
                            const date = formatDate(ex.createdAt)
                            
                            // Determine if current user paid or borrowed
                            const isPayer = ex.payer.id.toLowerCase() === userAddress?.toLowerCase()
                            const categoryType = ex.memo?.toLowerCase() || ''
                            let iconBgColor = 'bg-green-100' 
                            let iconColor = 'text-green-600'
                            let icon = null
                            
                            // Determine category icon based on memo
                            if (categoryType.includes('food') || categoryType.includes('bakery') || categoryType.includes('restaurant')) {
                              icon = (
                                <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0 0H6m6 0h6" />
                                </svg>
                              )
                            } else if (categoryType.includes('fuel') || categoryType.includes('gas')) {
                              iconBgColor = 'bg-red-100'
                              iconColor = 'text-red-600'
                              icon = (
                                <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                              )
                            } else if (categoryType.includes('movie') || categoryType.includes('entertainment')) {
                              iconBgColor = 'bg-purple-100'
                              iconColor = 'text-purple-600'
                              icon = (
                                <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                </svg>
                              )
                            } else if (categoryType.includes('date') || categoryType.includes('dinner')) {
                              iconBgColor = 'bg-green-100'
                              iconColor = 'text-green-600'
                              icon = (
                                <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              )
                            } else {
                              // Default icon
                              icon = (
                                <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              )
                            }
                            
                            // Calculate your share or what you're owed
                            const totalAmount = parseFloat(getUSDValue(ex.amount, ex.token).toFixed(2))
                            const memberCount = group?.members?.length || 1
                            const sharePerMember = totalAmount / memberCount
                            
                            return (
                              <div key={ex.id} className="flex items-center gap-3 mb-4">
                                {/* Date */}
                                <div className="text-center">
                                  <div className="text-gray-500">{date.month}</div>
                                  <div className="text-2xl font-semibold">{String(date.day).padStart(2, '0')}</div>
                                </div>
                                
                                {/* Category icon */}
                                <div className={`w-12 h-12 ${iconBgColor} rounded-md flex items-center justify-center`}>
                                  {icon}
                                </div>
                                
                                {/* Transaction details */}
                                <div className="flex-1">
                                  <div className="font-medium">{ex.memo || 'Expense'}</div>
                                  <div className="text-sm text-gray-600">
                                    <ENSName address={ex.payer.id} /> paid {formatTokenAmount(ex.amount, ex.token)}
                                  </div>
                                </div>
                                
                                {/* Amount borrowed/lent */}
                                <div className="text-right">
                                  {isPayer ? (
                                    <div className="text-green-600 font-medium">you lent<br />${(totalAmount - sharePerMember).toFixed(2)}</div>
                                  ) : (
                                    <div className="text-orange-600 font-medium">you borrowed<br />${sharePerMember.toFixed(2)}</div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                  </div>
                    ))
                  })()} 
                </>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No expenses yet
                </div>
              )}
          </div>
        )}
      </div>
      </div>

      {/* Add Expense Button */}
      <div className="fixed bottom-20 right-4 left-4 flex justify-center">
        <button
          onClick={() => setShowExpenseForm(true)}
          className="flex items-center gap-2 px-8 py-4 bg-teal-500 text-white rounded-full text-lg shadow-lg"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
          </svg>
          Add expense
        </button>
      </div>
      
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-2">
        <div className="flex justify-around items-center">
          <Link href="/" className="flex flex-col items-center text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">Groups</span>
          </Link>
          <Link href="#" className="flex flex-col items-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs">Activity</span>
          </Link>
          <Link href="#" className="flex flex-col items-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs">Account</span>
          </Link>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showExpenseForm && groupId && group && (
        <div className="fixed inset-0 bg-white z-50">
          <AddExpenseForm 
            groupId={groupId} 
            groupData={{
              id: group.id,
              name: group.name,
              members: group.members
            }}
            onClose={() => setShowExpenseForm(false)} 
          />
        </div>
      )}
    </div>
  )
}
