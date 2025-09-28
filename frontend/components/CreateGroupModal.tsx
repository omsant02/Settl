'use client'

import React, { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Loader2, UserPlus } from 'lucide-react'
import { SPLITWISE_CONTRACT_ADDRESS, SPLITWISE_CONTRACT_ABI } from '@/lib/contracts'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onGroupCreated: (group: {
    id: string | number;
    name: string;
    description: string;
    members: string[];
    totalExpenses: number;
    yourBalance: number;
    lastActivity: string;
    createdAt?: number;
  }) => void
}

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [txHash, setTxHash] = useState<string>('')

  const { address, isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()

  // Wait for transaction confirmation
  const { isSuccess: isConfirmed, isError: isTxError, error: txError } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}`,
  })

  // Handle group creation transaction results
  React.useEffect(() => {
    if (isConfirmed && txHash) {
      // Create new group object - in a real app, we'd get the group ID from contract events
      // For now, use a more realistic group ID format
      const groupId = Math.floor(Math.random() * 1000) + 1

      const newGroup = {
        id: groupId,
        name: groupName,
        description: description || '',
        members: ["You"], // Start with just the creator
        totalExpenses: 0,
        yourBalance: 0,
        lastActivity: "Just now",
        createdAt: Date.now() // Add timestamp for sorting
      }

      console.log('✅ Group created successfully on blockchain!', { txHash, newGroup })
      onGroupCreated(newGroup)

      // Reset form state
      setGroupName('')
      setDescription('')
      setIsCreating(false)
      setTxHash('')
      onClose()

      // Show success message
      alert(`✅ Group "${groupName}" created successfully!`)
    } else if (isTxError && txHash) {
      console.error('Group creation transaction failed:', txError)
      alert(`❌ Group creation failed: ${txError?.message || 'Transaction failed'}`)
      setIsCreating(false)
      setTxHash('')
    }
  }, [isConfirmed, isTxError, txHash, txError, groupName, description, onGroupCreated, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!groupName.trim()) {
      alert('Please enter a group name')
      return
    }

    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }

    setIsCreating(true)

    try {
      console.log('Creating group:', { groupName, description })

      // Create the group with the new Ledger contract - no registration required
      const txHash = await writeContractAsync({
        address: SPLITWISE_CONTRACT_ADDRESS,
        abi: SPLITWISE_CONTRACT_ABI,
        functionName: 'createGroup',
        args: [groupName, [address]] // Include creator in members array
      })

      console.log('Group creation transaction submitted:', txHash)
      setTxHash(txHash)

    } catch (error: any) {
      console.error('Failed to create group:', error)
      alert(`Failed to create group: ${error.message || 'Unknown error'}`)
      setIsCreating(false)
      setTxHash('')
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      setGroupName('')
      setDescription('')
      setTxHash('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        {!isCreating && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {/* Modal content */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create New Group</h2>
          <p className="text-gray-600">Start splitting expenses with your friends</p>
          {!isConnected && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                ⚠️ Please connect your wallet to create a group
              </p>
            </div>
          )}
        </div>

        {!isCreating ? (
          <>
            {/* Group Creation Form */}
            {isConnected ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name *
                  </label>
                  <Input
                    id="groupName"
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., Weekend Trip, Office Lunch"
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <Input
                    id="description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the group"
                    className="w-full"
                  />
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
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Create Group
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Creating Group...</h3>
                <p className="text-gray-600">Please sign the transaction in your wallet</p>
              </>
            ) : isTxError ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">❌</span>
                </div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">Group Creation Failed</h3>
                <p className="text-red-600 mb-4">{txError?.message || 'Transaction failed'}</p>
                <div className="bg-red-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-red-500 mb-1">Transaction Hash:</p>
                  <p className="text-xs font-mono break-all">{txHash}</p>
                </div>
                <Button onClick={() => {
                  setIsCreating(false)
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