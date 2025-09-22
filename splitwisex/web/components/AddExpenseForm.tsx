'use client'
import { useState, useEffect } from 'react'
import { uploadReceipt, ipfsGateway, createFilecoinDeal } from '@/lib/ipfs'
import Ledger from '@/abis/Ledger.json'
import { useWriteContract, useAccount } from 'wagmi'
import { useSubgraph } from '@/hooks/useSubgraph'
import { GET_GROUP } from '@/lib/queries'
import ENSName from './ENSName'

interface Member {
  id: string
  ensName?: string
}

interface Token {
  symbol: string
  name: string
  address: string
  decimals: number
}

// Token configurations for Sepolia testnet
const TOKENS: Token[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000', // ETH uses zero address
    decimals: 18
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC on Sepolia
    decimals: 6
  }
]

// Use actual blockchain tokens for currency display
const CURRENCY_OPTIONS = TOKENS.map(token => ({
  label: token.symbol,
  symbol: token.symbol === 'ETH' ? 'Ξ' : token.symbol,
  token: token
}))

interface AddExpenseFormProps {
  groupId: string
  groupData?: {
    id: string
    name: string
    members: Member[]
  }
  onClose?: () => void
  onExpenseAdded?: () => void
}

export default function AddExpenseForm({ groupId, groupData, onClose, onExpenseAdded }: AddExpenseFormProps) {
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [cid, setCid] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [selectedToken, setSelectedToken] = useState<Token>(TOKENS[0]) // Default to ETH
  const [splitType, setSplitType] = useState<'equal' | 'unequal'>('equal')
  const [customAmounts, setCustomAmounts] = useState<{ [memberId: string]: string }>({})
  const [paidBy, setPaidBy] = useState<string>('') // Who paid for the expense
  const [showMemberSelect, setShowMemberSelect] = useState(false)
  const [showSplitSelect, setShowSplitSelect] = useState(false)
  const [showCurrencySelect, setShowCurrencySelect] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCY_OPTIONS[0]) // Default to ETH
  const { writeContractAsync } = useWriteContract()
  const { address: userAddress } = useAccount()

  // Use provided group data or fetch it if needed
  const { data: fetchedGroupData } = useSubgraph<any>(groupData ? '' : GET_GROUP(groupId), [groupId])
  const group = groupData || fetchedGroupData?.group
  const members: Member[] = group?.members || []

  // Set default payer to current user when members are loaded
  useEffect(() => {
    if (userAddress && members.length > 0 && !paidBy) {
      const currentUserIsMember = members.some(m => m.id.toLowerCase() === userAddress.toLowerCase())
      if (currentUserIsMember) {
        setPaidBy(userAddress)
      } else if (members.length > 0) {
        setPaidBy(members[0].id)
      }
    }
  }, [userAddress, members, paidBy])

  // Remove payer from selected members when paidBy changes
  useEffect(() => {
    if (paidBy) {
      setSelectedMembers(prev => prev.filter(id => id !== paidBy))
      // Also remove their custom amount if they had one
      setCustomAmounts(prev => {
        const newAmounts = { ...prev }
        delete newAmounts[paidBy]
        return newAmounts
      })
    }
  }, [paidBy])

  // Auto-select all members (except payer) when split type is equal and members are loaded
  useEffect(() => {
    if (splitType === 'equal' && members.length > 0 && paidBy) {
      setSelectedMembers(members.filter(m => m.id !== paidBy).map(m => m.id))
    }
  }, [splitType, members, paidBy])

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => {
      const newSelection = prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]

      // If removing member, clear their custom amount
      if (prev.includes(memberId)) {
        setCustomAmounts(prevAmounts => {
          const newAmounts = { ...prevAmounts }
          delete newAmounts[memberId]
          return newAmounts
        })
      }

      return newSelection
    })
  }

  const selectAllMembers = () => {
    // Exclude the person who paid from the split
    setSelectedMembers(members.filter(m => m.id !== paidBy).map(m => m.id))
  }

  const clearSelection = () => {
    setSelectedMembers([])
    setCustomAmounts({})
  }

  const updateCustomAmount = (memberId: string, amount: string) => {
    setCustomAmounts(prev => ({
      ...prev,
      [memberId]: amount
    }))
  }

  // Calculate split amounts
  const totalAmount = parseFloat(amount || '0')

  const getCalculatedAmounts = () => {
    try {
      if (splitType === 'equal') {
        const equalAmount = selectedMembers.length > 0 ? totalAmount / selectedMembers.length : 0
        return selectedMembers.reduce((acc, memberId) => {
          acc[memberId] = isNaN(equalAmount) ? 0 : equalAmount
          return acc
        }, {} as { [memberId: string]: number })
      } else {
        // Unequal split - use custom amounts
        return selectedMembers.reduce((acc, memberId) => {
          const customAmount = parseFloat(customAmounts[memberId] || '0')
          acc[memberId] = isNaN(customAmount) ? 0 : customAmount
          return acc
        }, {} as { [memberId: string]: number })
      }
    } catch (error) {
      console.error('Error calculating amounts:', error)
      return {}
    }
  }

  const calculatedAmounts = getCalculatedAmounts()
  const totalSplitAmount = Object.values(calculatedAmounts).reduce((sum, amt) => {
    return sum + (isNaN(amt) ? 0 : amt)
  }, 0)
  const balanceError = Math.abs(totalSplitAmount - totalAmount) > 0.001

  // Helper function to convert amount to smallest unit (wei for ETH, smallest unit for tokens)
  const toTokenUnits = (amount: string, token: Token): bigint => {
    const amountFloat = parseFloat(amount || '0')
    return BigInt(Math.floor(amountFloat * Math.pow(10, token.decimals)))
  }

  const onUpload = async () => {
    if (!file) return
    setBusy(true)
    try {
      // Direct IPFS upload - simple and reliable
      console.log('Uploading receipt to IPFS, filename:', file.name)
      const c = await uploadReceipt(file)
      console.log('uploadReceipt returned CID:', c)
      console.log('CID type:', typeof c, 'Length:', c?.length)
      setCid(c)
      console.log('Receipt uploaded successfully - final CID:', c)
    } catch (error: any) {
      console.error('Receipt upload failed:', error)
      alert(`Failed to upload receipt: ${error.message || 'Unknown error'}`)
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = async (e: any) => {
    e.preventDefault()

    if (!userAddress) return alert('Please connect your wallet first')
    if (!paidBy) return alert('Please select who paid for the expense')
    if (!cid) return alert('Upload receipt first')
    if (!amount || parseFloat(amount) <= 0) return alert('Please enter a valid amount')
    if (selectedMembers.length === 0) return alert('Please select at least one person to split with')

    // Validate unequal splits
    if (splitType === 'unequal') {
      if (balanceError) {
        return alert(`Split amounts don't add up! Total: ${selectedCurrency.symbol}${totalSplitAmount.toFixed(2)}, Expected: ${selectedCurrency.symbol}${totalAmount.toFixed(2)}`)
      }

      // Check if all selected members have amounts > 0
      for (const memberId of selectedMembers) {
        if ((calculatedAmounts[memberId] || 0) <= 0) {
          return alert('All selected members must have an amount greater than 0')
        }
      }
    }

    setBusy(true)
    try {
      const contractAddr = process.env.NEXT_PUBLIC_LEDGER_ADDRESS as `0x${string}`
      const tokenAddress = selectedToken.address as `0x${string}`

      // Encode split data with amounts for each member
      // Format: address1(20 bytes) + amount1(32 bytes) + address2(20 bytes) + amount2(32 bytes) + ...
      let splitData = '0x'

      for (const memberId of selectedMembers) {
        const memberAmount = calculatedAmounts[memberId] || 0
        const memberAmountUnits = toTokenUnits(memberAmount.toString(), selectedToken)

        // Add address (20 bytes, remove 0x prefix)
        splitData += memberId.slice(2)

        // Add amount (32 bytes, pad with zeros)
        const amountHex = memberAmountUnits.toString(16).padStart(64, '0')
        splitData += amountHex
      }

      // Convert amount to token units (wei for ETH, smallest unit for tokens)
      const tokenUnits = toTokenUnits(amount, selectedToken)

      const txHash = await writeContractAsync({
        address: contractAddr,
        abi: Ledger.abi,
        functionName: 'addExpense',
        args: [BigInt(groupId), paidBy as `0x${string}`, tokenAddress, tokenUnits, splitData, cid, memo || 'No description']
      })

      console.log('Expense added to blockchain:', txHash)

      // Get transaction receipt to extract expenseId from logs
      const receipt = await window.ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      })

      // Extract expenseId from ExpenseAdded event log
      let expenseId = null
      if (receipt && receipt.logs) {
        console.log('Transaction receipt logs:', receipt.logs)

        // Find the ExpenseAdded event log
        // Event signature: ExpenseAdded(uint256 indexed groupId, uint256 indexed expenseId, address indexed payer, ...)
        // topics[0] = event signature hash
        // topics[1] = groupId (first indexed parameter)
        // topics[2] = expenseId (second indexed parameter)
        // topics[3] = payer (third indexed parameter)
        for (const log of receipt.logs) {
          if (log.topics && log.topics.length >= 3) {
            // ExpenseAdded event should have at least 3 indexed parameters + signature
            if (log.topics[2]) {
              expenseId = parseInt(log.topics[2], 16)
              console.log('Extracted expenseId from logs:', expenseId)
              break
            }
          }
        }

        if (expenseId === null) {
          console.warn('Could not extract expenseId from transaction logs. Logs structure:')
          console.warn(receipt.logs.map((log: any, i: number) => ({ index: i, topics: log.topics, data: log.data })))
        }
      }

      // Skip Filecoin deal creation as it's causing technical issues
      // Just show success message with IPFS information
      alert(`✅ Expense added successfully!\n\n💾 Receipt stored on IPFS: ${cid}\n💰 ${splitType} split calculated and debts updated.`)

      // Reset form
      setAmount('')
      setMemo('')
      setFile(null)
      setCid(null)
      setSelectedMembers([])
      setCustomAmounts({})
      setSplitType('equal')
      // Reset to current user or first member if current user is not a member
      const currentUserIsMember = members.some(m => m.id.toLowerCase() === userAddress?.toLowerCase())
      setPaidBy(currentUserIsMember && userAddress ? userAddress : (members[0]?.id || ''))

      // Close form and trigger refresh
      if (onClose) onClose()

      // Notify parent component to refresh data after a delay to allow subgraph indexing
      setTimeout(() => {
        if (onExpenseAdded) {
          onExpenseAdded()
        } else {
          // Fallback to page reload if no callback provided
          window.location.reload()
        }
      }, 2000) // 2 second delay for subgraph indexing
    } catch (error: any) {
      console.error('Failed to add expense:', error)
      alert(`Failed to add expense: ${error.message || 'Unknown error'}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <button type="button" onClick={() => onClose ? onClose() : window.history.back()} className="p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-medium">Add expense</h1>
        <button type="submit" className="p-2" disabled={busy}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-6">
        {/* Group Name */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="font-medium">{group?.name || 'Group'}</span>
          </div>
        </div>

        {/* Description Input */}
        <div className="flex items-center space-x-3 border-b pb-3">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <input
            className="flex-1 text-lg outline-none"
            placeholder="Enter a description"
            value={memo}
            onChange={e => setMemo(e.target.value)}
          />
        </div>

        {/* Currency Selection */}
        <div className="flex items-center space-x-3 border-b pb-3">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            <span className="text-lg font-medium">{selectedCurrency.symbol}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowCurrencySelect(true)}
            className="flex-1 text-lg outline-none text-left bg-transparent"
          >
            <span className="text-gray-500">Token: </span>
            <span className="font-medium">{selectedCurrency.label}</span>
          </button>
        </div>

        {/* Amount Input */}
        <div className="flex items-center space-x-3 border-b pb-3">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl font-medium">
            {selectedCurrency.symbol}
          </div>
          <input
            className="flex-1 text-2xl outline-none"
            placeholder="0.00"
            type="number"
            step={selectedToken.symbol === 'ETH' ? '0.000001' : '0.01'}
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

      {/* Split Options */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className="text-gray-600">Paid by</span>
          <button
            type="button"
            className="bg-gray-100 px-4 py-1 rounded-full text-gray-800 font-medium"
            onClick={() => setShowMemberSelect(true)}
          >
            {paidBy ? (
              paidBy.toLowerCase() === userAddress?.toLowerCase() ? 'you' :
              <ENSName address={paidBy} />
            ) : 'you'}
          </button>
          <span className="text-gray-600">and split</span>
          <button
            type="button"
            className="bg-gray-100 px-4 py-1 rounded-full text-gray-800 font-medium"
            onClick={() => setShowSplitSelect(true)}
          >
            {splitType === 'equal' ? 'equally' : 'unequally'}
          </button>
        </div>
      </div>

      {/* Member Selection for Split (if unequal is selected) */}
      {splitType === 'unequal' && (
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 font-medium">Select people to split with:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllMembers}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                All
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                None
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {members.map((member) => {
              const isPayer = member.id === paidBy
              return (
                <div key={member.id} className={`flex items-center justify-between p-3 rounded-lg ${
                  isPayer ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => !isPayer && toggleMember(member.id)}
                      disabled={isPayer}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isPayer
                          ? 'bg-orange-200 border-orange-300 cursor-not-allowed'
                          : selectedMembers.includes(member.id)
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {isPayer ? (
                        <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : selectedMembers.includes(member.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                      {member.id.slice(2, 4).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        <ENSName address={member.id} />
                        {isPayer && <span className="text-xs text-orange-600 ml-2">(paid)</span>}
                      </div>
                      <div className="text-xs text-gray-500">
                        {member.id.slice(0, 6)}...{member.id.slice(-4)}
                      </div>
                    </div>
                  </div>

                  {selectedMembers.includes(member.id) && !isPayer && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Amount"
                        value={customAmounts[member.id] || ''}
                        onChange={(e) => updateCustomAmount(member.id, e.target.value)}
                        className="w-20 px-2 py-1 text-sm border rounded"
                        step={selectedToken.symbol === 'ETH' ? '0.000001' : '0.01'}
                      />
                      <span className="text-xs text-gray-500">{selectedCurrency.symbol}</span>
                    </div>
                  )}
                  {isPayer && (
                    <div className="text-sm text-orange-600 font-medium">
                      Already paid
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {selectedMembers.length > 0 && splitType === 'unequal' && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm">
                <div className="flex justify-between">
                  <span>Total split: </span>
                  <span className={balanceError ? 'text-red-600' : 'text-green-600'}>
                    {selectedCurrency.symbol}{totalSplitAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Expected total: </span>
                  <span>{selectedCurrency.symbol}{totalAmount.toFixed(2)}</span>
                </div>
                {balanceError && (
                  <div className="text-xs text-red-600 mt-1">
                    ⚠️ Split amounts don't match the total
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Equal Split Member Selection */}
      {splitType === 'equal' && (
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 font-medium">Split equally between:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllMembers}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                All
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                None
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {members.map((member) => {
              const isPayer = member.id === paidBy
              return (
                <div key={member.id} className={`flex items-center justify-between p-3 rounded-lg ${
                  isPayer ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => !isPayer && toggleMember(member.id)}
                      disabled={isPayer}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isPayer
                          ? 'bg-orange-200 border-orange-300 cursor-not-allowed'
                          : selectedMembers.includes(member.id)
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {isPayer ? (
                        <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : selectedMembers.includes(member.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                      {member.id.slice(2, 4).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        <ENSName address={member.id} />
                        {isPayer && <span className="text-xs text-orange-600 ml-2">(paid)</span>}
                      </div>
                      <div className="text-xs text-gray-500">
                        {member.id.slice(0, 6)}...{member.id.slice(-4)}
                      </div>
                    </div>
                  </div>

                  {selectedMembers.includes(member.id) && !isPayer && (
                    <div className="text-sm text-green-600 font-medium">
                      {selectedCurrency.symbol}{selectedMembers.length > 0 ? (totalAmount / selectedMembers.length).toFixed(2) : '0.00'}
                    </div>
                  )}
                  {isPayer && (
                    <div className="text-sm text-orange-600 font-medium">
                      Already paid
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {selectedMembers.length > 0 && (
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-sm text-green-700">
                Each person pays: <strong>{selectedCurrency.symbol}{(totalAmount / selectedMembers.length).toFixed(2)}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="mt-auto border-t">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="font-medium">{group?.name || 'Group'}</span>
          </div>
          <div className="flex items-center space-x-4">
            {/* Encryption Toggle */}
            {/* Camera/Upload Button */}
            <button type="button" className="p-2" onClick={() => document.getElementById('receipt')?.click()}>
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* File Upload Status */}
            {file && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-green-600">📎 {file.name}</span>
                {!cid && (
                  <button
                    type="button"
                    onClick={onUpload}
                    disabled={busy}
                    className="text-sm bg-blue-500 text-white px-2 py-1 rounded disabled:opacity-50"
                  >
                    {busy ? 'Uploading...' : 'Upload'}
                  </button>
                )}
                {cid && (
                  <span className="text-sm text-green-600">
                    ✅ Uploaded to IPFS
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        id="receipt"
        type="file"
        className="hidden"
        accept="image/*"
        onChange={e => setFile(e.target.files?.[0] || null)}
      />

      {/* Member Selection Modal */}
      {showMemberSelect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-auto">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Who paid?</h3>
            </div>
            <div className="p-4 space-y-3">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    setPaidBy(member.id)
                    setShowMemberSelect(false)
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    paidBy === member.id ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {member.id.slice(2, 4).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">
                      <ENSName address={member.id} />
                    </div>
                    <div className="text-sm text-gray-500">
                      {member.id.slice(0, 6)}...{member.id.slice(-4)}
                    </div>
                  </div>
                  {paidBy === member.id && (
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="p-4 border-t">
              <button
                type="button"
                onClick={() => setShowMemberSelect(false)}
                className="w-full py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Type Selection Modal */}
      {showSplitSelect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">How to split?</h3>
            </div>
            <div className="p-4 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setSplitType('equal')
                  // Auto-select all members except the payer when switching to equal split
                  setSelectedMembers(members.filter(m => m.id !== paidBy).map(m => m.id))
                  setCustomAmounts({}) // Clear custom amounts
                  setShowSplitSelect(false)
                }}
                className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors ${
                  splitType === 'equal' ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="text-left">
                  <div className="font-medium">Split equally</div>
                  <div className="text-sm text-gray-500">Everyone pays the same amount</div>
                </div>
                {splitType === 'equal' && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSplitType('unequal')
                  // Clear all selections when switching to unequal split
                  setSelectedMembers([])
                  setCustomAmounts({})
                  setShowSplitSelect(false)
                }}
                className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors ${
                  splitType === 'unequal' ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="text-left">
                  <div className="font-medium">Split unequally</div>
                  <div className="text-sm text-gray-500">Enter custom amounts for each person</div>
                </div>
                {splitType === 'unequal' && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
            <div className="p-4 border-t">
              <button
                type="button"
                onClick={() => setShowSplitSelect(false)}
                className="w-full py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Currency Selection Modal */}
      {showCurrencySelect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Select Token</h3>
              <p className="text-sm text-gray-500 mt-1">Choose the blockchain token for this expense</p>
            </div>
            <div className="p-4 space-y-3">
              {CURRENCY_OPTIONS.map((currency) => (
                <button
                  key={currency.label}
                  type="button"
                  onClick={() => {
                    setSelectedCurrency(currency)
                    setSelectedToken(currency.token) // Sync token selection with currency
                    setShowCurrencySelect(false)
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors ${
                    selectedCurrency.label === currency.label ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-lg">
                      {currency.symbol}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{currency.label}</div>
                      <div className="text-sm text-gray-500">
                        {currency.label === 'USD' ? 'US Dollar' :
                         currency.label === 'INR' ? 'Indian Rupee' :
                         'Ethereum'}
                      </div>
                    </div>
                  </div>
                  {selectedCurrency.label === currency.label && (
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="p-4 border-t">
              <button
                type="button"
                onClick={() => setShowCurrencySelect(false)}
                className="w-full py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </form>
  )
}


