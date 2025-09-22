'use client'
import { useSubgraph } from '@/hooks/useSubgraph'
import { GET_DEBTS } from '@/lib/queries'
import { useAccount } from 'wagmi'
import { useState } from 'react'
import ENSName from './ENSName'

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


// Helper function to get raw amount
const getRawAmount = (amount: string, tokenAddress: string): number => {
  const token = TOKEN_INFO[tokenAddress.toLowerCase()] || { symbol: 'TOKEN', decimals: 18 }
  return Number(amount) / Math.pow(10, token.decimals)
}

interface MemberBalance {
  address: string
  ethAmount: number
  usdcAmount: number
  totalUSD: number
}

interface MemberModalProps {
  member: MemberBalance | null
  isOpen: boolean
  onClose: () => void
  isOwedToMe: boolean
}

function MemberModal({ member, isOpen, onClose, isOwedToMe }: MemberModalProps) {
  if (!isOpen || !member) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {isOwedToMe ? 'Owes You' : 'You Owe'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="text-center mb-6">
          <ENSName address={member.address} />
        </div>

        <div className="space-y-4">
          {member.ethAmount > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">ETH Amount:</span>
                <span className="font-semibold">{member.ethAmount.toFixed(6)} ETH</span>
              </div>
              <div className="text-sm text-gray-500 text-right">
                ≈${(member.ethAmount * 3300).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
            </div>
          )}

          {member.usdcAmount > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">USDC Amount:</span>
                <span className="font-semibold">{member.usdcAmount.toFixed(2)} USDC</span>
              </div>
              <div className="text-sm text-gray-500 text-right">
                ≈${member.usdcAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total USD Value:</span>
              <span className={isOwedToMe ? 'text-green-600' : 'text-red-600'}>
                ${member.totalUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default function Balances({ groupId }: { groupId: string }) {
  const { data, loading } = useSubgraph<{ debtEdges: any[] }>(GET_DEBTS(groupId), [groupId])
  const { address: userAddress } = useAccount()
  const [selectedMember, setSelectedMember] = useState<MemberBalance | null>(null)
  const [modalType, setModalType] = useState<'owed' | 'owing' | null>(null)

  if (loading) return <div className="p-4">Loading balances...</div>

  const edges = data?.debtEdges || []

  // Separate debts: what I owe vs what others owe me
  const myDebts = edges.filter(e => 
    e.debtor.id.toLowerCase() === userAddress?.toLowerCase() && 
    e.creditor.id.toLowerCase() !== userAddress?.toLowerCase() // Ensure I'm not owing to myself
  )
  
  const owedToMe = edges.filter(e => 
    e.creditor.id.toLowerCase() === userAddress?.toLowerCase() && 
    e.debtor.id.toLowerCase() !== userAddress?.toLowerCase() // Ensure others are not me
  )
  
  const otherDebts = edges.filter(e =>
    e.debtor.id.toLowerCase() !== userAddress?.toLowerCase() &&
    e.creditor.id.toLowerCase() !== userAddress?.toLowerCase()
  )

  // Consolidate balances by member to avoid duplicates
  const consolidateBalances = (debts: any[]) => {
    const consolidated: { [address: string]: MemberBalance } = {}

    debts.forEach(debt => {
      // For my debts, we want the creditor address
      // For debts owed to me, we want the debtor address
      const memberAddress = debt.creditor?.id || debt.debtor?.id
      
      // Skip if no address or if the address is the user's own address
      if (!memberAddress || memberAddress.toLowerCase() === userAddress?.toLowerCase()) return

      if (!consolidated[memberAddress]) {
        consolidated[memberAddress] = {
          address: memberAddress,
          ethAmount: 0,
          usdcAmount: 0,
          totalUSD: 0
        }
      }

      const token = TOKEN_INFO[debt.token.toLowerCase()]
      const amount = getRawAmount(debt.amount, debt.token)

      if (token?.symbol === 'ETH') {
        consolidated[memberAddress].ethAmount += amount
        consolidated[memberAddress].totalUSD += amount * 3300
      } else if (token?.symbol === 'USDC') {
        consolidated[memberAddress].usdcAmount += amount
        consolidated[memberAddress].totalUSD += amount
      }
    })

    return Object.values(consolidated).filter(member => member.totalUSD > 0)
  }

  const myDebtBalances = consolidateBalances(myDebts.map(d => ({ ...d, address: d.creditor.id })))
  const owedToMeBalances = consolidateBalances(owedToMe.map(d => ({ ...d, address: d.debtor.id })))

  const openMemberModal = (member: MemberBalance, type: 'owed' | 'owing') => {
    setSelectedMember(member)
    setModalType(type)
  }

  return (
    <div className="space-y-4">
      {/* My Debts - What I need to pay */}
      {myDebtBalances.length > 0 && (
        <div className="p-4 rounded-xl border bg-red-50 border-red-200">
          <div className="text-lg font-semibold mb-3 text-red-800">💸 You owe</div>
          <div className="space-y-3">
            {myDebtBalances.map((member) => (
              <div
                key={member.address}
                className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50"
                onClick={() => openMemberModal(member, 'owing')}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">You owe</span>
                  <ENSName address={member.address} />
                  <span className="font-semibold text-red-600">
                    ${member.totalUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-xs text-red-500 px-3 py-1 bg-red-100 rounded-full">
                  Click for details
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Owed to Me - What others need to pay me */}
      {owedToMeBalances.length > 0 && (
        <div className="p-4 rounded-xl border bg-green-50 border-green-200">
          <div className="text-lg font-semibold mb-3 text-green-800">💰 Others owe you</div>
          <div className="space-y-3">
            {owedToMeBalances.map((member) => (
              <div
                key={member.address}
                className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50"
                onClick={() => openMemberModal(member, 'owed')}
              >
                <div className="flex items-center gap-2">
                  <ENSName address={member.address} />
                  <span className="text-sm">owes you</span>
                  <span className="font-semibold text-green-600">
                    ${member.totalUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-xs text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
                  Click for details
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Group Debts */}
      {otherDebts.length > 0 && (
        <div className="p-4 rounded-xl border bg-gray-50 border-gray-200">
          <div className="text-lg font-semibold mb-3 text-gray-700">👥 Other group debts</div>
          <div className="space-y-2">
            {otherDebts.map((debt) => (
              <div key={debt.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  <ENSName address={debt.debtor.id} />
                  <span>owes</span>
                  <ENSName address={debt.creditor.id} />
                </div>
                <span className="text-gray-600">
                  {formatTokenAmount(debt.amount, debt.token)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Debts */}
      {edges.length === 0 && (
        <div className="p-6 rounded-xl border bg-green-50 border-green-200 text-center">
          <div className="text-2xl mb-2">🎉</div>
          <div className="text-lg font-semibold text-green-800 mb-1">All settled up!</div>
          <div className="text-sm text-green-700">No outstanding debts in this group</div>
        </div>
      )}

      {/* Member Details Modal */}
      <MemberModal
        member={selectedMember}
        isOpen={!!selectedMember}
        onClose={() => {
          setSelectedMember(null)
          setModalType(null)
        }}
        isOwedToMe={modalType === 'owed'}
      />
    </div>
  )
}


