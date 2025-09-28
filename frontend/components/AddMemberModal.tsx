'use client'

import React, { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { Button } from '@/components/ui/button'
import { X, Loader2, UserPlus, Users } from 'lucide-react'
import { SPLITWISE_CONTRACT_ADDRESS, SPLITWISE_CONTRACT_ABI } from '@/lib/contracts'
import { DEMO_WALLETS, getWalletDisplayName } from '@/lib/demo-wallets'

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string | number
  groupName: string
  currentMembers: string[]
  onMemberAdded: (newMember: { address: string; displayName: string }) => void
}

export default function AddMemberModal({
  isOpen,
  onClose,
  groupId,
  groupName,
  currentMembers,
  onMemberAdded
}: AddMemberModalProps) {
  const [selectedWallet, setSelectedWallet] = useState<string>('')
  const [isAdding, setIsAdding] = useState(false)
  const [txHash, setTxHash] = useState<string>('')

  const { address, isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()

  // Wait for transaction confirmation
  const { isSuccess: isConfirmed, isError: isTxError, error: txError } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}`,
  })

  // Get available wallets (exclude current members)
  const availableWallets = DEMO_WALLETS.filter(wallet =>
    !currentMembers.includes(wallet.displayName) &&
    wallet.address.toLowerCase() !== address?.toLowerCase()
  )

  // Handle member addition transaction results
  React.useEffect(() => {
    if (isConfirmed && txHash && selectedWallet) {
      const wallet = DEMO_WALLETS.find(w => w.address === selectedWallet)
      if (wallet) {
        console.log('✅ Member added successfully to blockchain!', { txHash, wallet })
        onMemberAdded({
          address: wallet.address,
          displayName: wallet.displayName
        })

        // Reset form state
        setSelectedWallet('')
        setIsAdding(false)
        setTxHash('')
        onClose()

        // Show success message
        alert(`✅ ${wallet.displayName} added to "${groupName}" successfully!`)
      }
    } else if (isTxError && txHash) {
      console.error('Add member transaction failed:', txError)
      alert(`❌ Failed to add member: ${txError?.message || 'Transaction failed'}`)
      setIsAdding(false)
      setTxHash('')
    }
  }, [isConfirmed, isTxError, txHash, txError, selectedWallet, groupName, onMemberAdded, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedWallet) {
      alert('Please select a member to add')
      return
    }

    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }

    setIsAdding(true)

    try {
      console.log('Adding member to group:', { groupId, selectedWallet })

      // Add member using the Ledger contract
      const txHash = await writeContractAsync({
        address: SPLITWISE_CONTRACT_ADDRESS,
        abi: SPLITWISE_CONTRACT_ABI,
        functionName: 'addMember',
        args: [BigInt(groupId), selectedWallet as `0x${string}`]
      })

      console.log('Add member transaction submitted:', txHash)
      setTxHash(txHash)

    } catch (error: any) {
      console.error('Failed to add member:', error)
      alert(`Failed to add member: ${error.message || 'Unknown error'}`)
      setIsAdding(false)
      setTxHash('')
    }
  }

  const handleClose = () => {
    if (!isAdding) {
      setSelectedWallet('')
      setTxHash('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        {!isAdding && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {/* Modal content */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Member</h2>
          <p className="text-gray-600">Add a new member to "{groupName}"</p>
          {!isConnected && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                ⚠️ Please connect your wallet to add members
              </p>
            </div>
          )}
        </div>

        {!isAdding ? (
          <>
            {/* Member Selection Form */}
            {isConnected ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Member to Add
                  </label>

                  {availableWallets.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {availableWallets.map((wallet) => (
                        <label
                          key={wallet.address}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedWallet === wallet.address
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="member"
                            value={wallet.address}
                            checked={selectedWallet === wallet.address}
                            onChange={(e) => setSelectedWallet(e.target.value)}
                            className="sr-only"
                          />
                          <div className="text-2xl">{wallet.avatar}</div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{wallet.displayName}</div>
                            <div className="text-sm text-gray-500">{wallet.name}</div>
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No available members to add</p>
                      <p className="text-sm">All demo accounts are already in this group</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!selectedWallet || availableWallets.length === 0}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </form>
            ) : (
              /* Wallet Not Connected */
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Please connect your wallet to continue</p>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            {!txHash ? (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Adding Member...</h3>
                <p className="text-gray-600">Please sign the transaction in your wallet</p>
              </>
            ) : isTxError ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">❌</span>
                </div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Add Member</h3>
                <p className="text-red-600 mb-4">{txError?.message || 'Transaction failed'}</p>
                <div className="bg-red-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-red-500 mb-1">Transaction Hash:</p>
                  <p className="text-xs font-mono break-all">{txHash}</p>
                </div>
                <Button onClick={() => {
                  setIsAdding(false)
                  setTxHash('')
                }} className="w-full">
                  Try Again
                </Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Transaction Submitted</h3>
                <p className="text-gray-600 mb-4">Waiting for confirmation...</p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Transaction Hash:</p>
                  <p className="text-xs font-mono break-all">{txHash}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}