'use client'
import { useParams, useRouter } from 'next/navigation'
import { useSubgraph } from '@/hooks/useSubgraph'
import { GET_EXPENSE_BY_ID, GET_GROUP_BY_NAME } from '@/lib/queries'
import ENSName from '@/components/ENSName'
import { ipfsGateway, ipfsGateways } from '@/lib/ipfs'
import Link from 'next/link'
import { useAccount, useWriteContract } from 'wagmi'
import { useState } from 'react'
import Ledger from '@/abis/Ledger.json'

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
  const { writeContractAsync } = useWriteContract()
  const [isDeleting, setIsDeleting] = useState(false)

  // Receipt image component with fallback gateways
  function ReceiptImage({ cid, primaryUrl, isLegacy }: { cid: string; primaryUrl: string; isLegacy: boolean }) {
    const [currentUrlIndex, setCurrentUrlIndex] = useState(0)
    const [hasError, setHasError] = useState(false)

    // Get clean CID for fallback gateways
    const cleanCid = cid.startsWith('ipfs:') ? cid.substring(5) : cid
    const fallbackUrls = [
      primaryUrl,
      ipfsGateways.ipfs(cleanCid),
      ipfsGateways.cloudflare(cleanCid),
      ipfsGateways.dweb(cleanCid),
    ]

    const handleImageError = () => {
      console.log(`Image failed to load from: ${fallbackUrls[currentUrlIndex]}`)

      if (currentUrlIndex < fallbackUrls.length - 1) {
        setCurrentUrlIndex(prev => prev + 1)
        setHasError(false)
      } else {
        setHasError(true)
      }
    }

    const handleImageLoad = () => {
      console.log(`Image loaded successfully from: ${fallbackUrls[currentUrlIndex]}`)
      setHasError(false)
    }

    if (hasError) {
      return (
        <div className="w-full h-64 bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-500">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-medium mb-2">Receipt unavailable</p>
          <p className="text-xs text-center">
            CID: {cleanCid.slice(0, 10)}...{cleanCid.slice(-10)}
          </p>
        </div>
      )
    }

    return (
      <img
        src={fallbackUrls[currentUrlIndex]}
        alt="Receipt"
        className="w-full rounded-lg shadow-sm"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    )
  }

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
      const contractAddr = process.env.NEXT_PUBLIC_LEDGER_ADDRESS as `0x${string}`

      const txHash = await writeContractAsync({
        address: contractAddr,
        abi: Ledger.abi,
        functionName: 'voidExpense',
        args: [BigInt(group.id), BigInt(expenseId)]
      })

      console.log('Expense deleted:', txHash)
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
            {(() => {
              // Check if this is a legacy receipt that needs fixing
              const isLegacyReceipt = expense.cid.includes('/') && !expense.cid.includes('storacha-upload-')
              const primaryUrl = ipfsGateway(expense.cid)

              console.log('Receipt CID:', expense.cid)
              console.log('Is legacy receipt:', isLegacyReceipt)
              console.log('Using image URL:', primaryUrl)

              return (
                <ReceiptImage
                  cid={expense.cid}
                  primaryUrl={primaryUrl}
                  isLegacy={isLegacyReceipt}
                />
              )
            })()}
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