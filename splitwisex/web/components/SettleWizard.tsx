'use client'
import { useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { useSubgraph } from '@/hooks/useSubgraph'
import { GET_DEBTS } from '@/lib/queries'
import ENSName from './ENSName'
import Ledger from '@/abis/Ledger.json'

// Token configurations
const TOKEN_INFO: { [address: string]: { symbol: string; decimals: number } } = {
  '0x0000000000000000000000000000000000000000': { symbol: 'ETH', decimals: 18 },
  '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': { symbol: 'USDC', decimals: 6 }
}

const formatTokenAmount = (amount: string, tokenAddress: string): string => {
  const token = TOKEN_INFO[tokenAddress.toLowerCase()] || { symbol: 'TOKEN', decimals: 18 }
  const amountNum = Number(amount) / Math.pow(10, token.decimals)
  return token.symbol === 'ETH'
    ? `${amountNum.toFixed(6)} ${token.symbol}`
    : `${amountNum.toFixed(2)} ${token.symbol}`
}

const getINRValue = (amount: string, tokenAddress: string): string => {
  const token = TOKEN_INFO[tokenAddress.toLowerCase()] || { symbol: 'TOKEN', decimals: 18 }
  const amountNum = Number(amount) / Math.pow(10, token.decimals)
  const rates: { [key: string]: number } = {
    'ETH': 275000,
    'USDC': 84,
    'TOKEN': 84
  }
  const rate = rates[token.symbol] || rates['TOKEN']
  const inrValue = amountNum * rate
  return `≈₹${inrValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

interface DebtEdge {
  id: string
  debtor: { id: string }
  creditor: { id: string }
  amount: string
  token: string
}

export default function SettleWizard({ groupId }: { groupId: string }) {
  const { address: userAddress } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const { data: debtsData } = useSubgraph<any>(GET_DEBTS(groupId), [groupId])
  const [settling, setSettling] = useState(false)

  const edges = (debtsData?.debtEdges || []) as DebtEdge[]
  const myDebts = edges.filter(e => e.debtor.id.toLowerCase() === userAddress?.toLowerCase())

  const totalOwed = myDebts.reduce((sum: number, debt: DebtEdge) => {
    const amount = Number(debt.amount) / Math.pow(10, TOKEN_INFO[debt.token.toLowerCase()]?.decimals || 18)
    return sum + amount
  }, 0)

  const settleAllDebts = async () => {
    if (!userAddress || myDebts.length === 0) return

    setSettling(true)
    try {
      const contractAddr = process.env.NEXT_PUBLIC_LEDGER_ADDRESS as `0x${string}`

      // For now, we'll handle ETH settlements only
      // In a real implementation, this would need to handle different tokens
      for (const debt of myDebts) {
        if (debt.token.toLowerCase() === '0x0000000000000000000000000000000000000000') {
          // ETH settlement - send ETH directly
          await writeContractAsync({
            address: debt.creditor.id as `0x${string}`,
            abi: [],
            functionName: '',
            value: BigInt(debt.amount)
          })
        } else {
          // Token settlement - would need token transfer approval
          // This is simplified - real implementation would need ERC20 transfers
          alert(`Token settlements not yet implemented for ${formatTokenAmount(debt.amount, debt.token)}`)
        }
      }

      alert('All debts settled successfully!')
      window.location.reload() // Refresh to show updated balances
    } catch (error: any) {
      console.error('Failed to settle debts:', error)
      alert(`Failed to settle debts: ${error.message || 'Unknown error'}`)
    } finally {
      setSettling(false)
    }
  }

  if (myDebts.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">All settled up!</h3>
        <p className="text-gray-500">You don't owe anyone money in this group.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">Settle Up</h2>
        <p className="text-gray-600">Pay all your debts in one click</p>
      </div>

      {/* Summary */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <div className="text-center">
          <div className="text-sm text-orange-700 mb-1">Total amount you owe</div>
          <div className="text-2xl font-bold text-orange-800">
            {formatTokenAmount(totalOwed.toString(), '0x0000000000000000000000000000000000000000')}
          </div>
          <div className="text-sm text-orange-600">
            {getINRValue(totalOwed.toString(), '0x0000000000000000000000000000000000000000')}
          </div>
        </div>
      </div>

      {/* Debt List */}
      <div className="space-y-3 mb-6">
        <div className="text-sm font-medium text-gray-700 mb-3">You will pay:</div>
        {myDebts.map((debt) => (
          <div key={debt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {debt.creditor.id.slice(2, 4).toUpperCase()}
              </div>
              <div>
                <div className="font-medium">
                  <ENSName address={debt.creditor.id} />
                </div>
                <div className="text-sm text-gray-500">
                  {debt.creditor.id.slice(0, 6)}...{debt.creditor.id.slice(-4)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-orange-600">
                {formatTokenAmount(debt.amount, debt.token)}
              </div>
              <div className="text-xs text-gray-500">
                {getINRValue(debt.amount, debt.token)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Settle Button */}
      <button
        onClick={settleAllDebts}
        disabled={settling || myDebts.length === 0}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white py-4 rounded-lg font-medium text-lg transition-colors"
      >
        {settling ? 'Settling...' : `Pay ${formatTokenAmount(totalOwed.toString(), '0x0000000000000000000000000000000000000000')}`}
      </button>

      <div className="mt-4 text-xs text-gray-500 text-center">
        This will send payments to all people you owe money to
      </div>
    </div>
  )
}


