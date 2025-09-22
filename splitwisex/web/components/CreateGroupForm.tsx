'use client'
import { useState, useEffect } from 'react'
import { useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import Ledger from '@/abis/Ledger.json'

// Available members to select from
const availableMembers = [
  { address: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', name: 'alice.eth' },
  { address: '0x8bc38e23a9f42ecd0216d4724dc5f3c7ce91962a', name: 'bob.eth' },
  { address: '0x90f79bf6eb2c4f870365e785982e1f101e93b906', name: 'charlie.eth' },
  { address: '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65', name: 'dave.eth' },
  { address: '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc', name: 'eve.eth' },
  { address: '0x976ea74026e726554db657fa54763abd0c3a0aa9', name: 'frank.eth' },
  { address: '0x14dc79964da2c08b23698b3d3cc7ca32193d9955', name: 'grace.eth' },
  { address: '0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f', name: 'henry.eth' },
]

interface CreateGroupFormProps {
  onGroupCreated?: () => void
}

export default function CreateGroupForm({ onGroupCreated }: CreateGroupFormProps) {
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const { writeContractAsync } = useWriteContract()
  const { isConnected, address } = useAccount()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // Poll for new group after transaction is confirmed
  useEffect(() => {
    if (isConfirmed && txHash) {
      setBusy(false) // Reset busy state once transaction is confirmed

      const pollForGroup = async () => {
        let attempts = 0
        const maxAttempts = 10

        const poll = async () => {
          attempts++

          // Wait a bit longer each time
          await new Promise(resolve => setTimeout(resolve, 2000 * attempts))

          if (attempts >= maxAttempts) {
            // Give up and call refetch or refresh
            if (onGroupCreated) {
              onGroupCreated()
            } else {
              window.location.reload()
            }
            return
          }

          // Try calling refetch first
          if (onGroupCreated) {
            onGroupCreated()
            // Wait a bit and try again if needed
            setTimeout(poll, 1000)
          } else {
            // Try polling again
            poll()
          }
        }

        // Start polling after a short delay
        setTimeout(poll, 1000)
      }

      pollForGroup()
    }
  }, [isConfirmed, txHash, onGroupCreated])

  const toggleMember = (address: string) => {
    setSelectedMembers(prev =>
      prev.includes(address)
        ? prev.filter(a => a !== address)
        : [...prev, address]
    )
  }

  const onSubmit = async (e: any) => {
    e.preventDefault()

    if (!isConnected) {
      return alert('Please connect your wallet first')
    }

    if (!groupName.trim() || selectedMembers.length === 0) {
      return alert('Please enter a group name and select at least one member')
    }

    setBusy(true)
    try {
      const addr = process.env.NEXT_PUBLIC_LEDGER_ADDRESS as `0x${string}`
      const hash = await writeContractAsync({
        address: addr,
        abi: Ledger.abi,
        functionName: 'createGroup',
        args: [groupName, selectedMembers]
      })

      setTxHash(hash)

      // Reset form
      setGroupName('')
      setSelectedMembers([])
      setIsOpen(false)
    } catch (error: any) {
      console.error('Failed to create group:', error)
      const errorMsg = error?.details || error?.message || 'Unknown error'
      alert(`Failed to create group: ${errorMsg}`)
    } finally {
      setBusy(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        disabled={!isConnected}
        className={`px-4 py-2 rounded-lg ${
          isConnected
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
        }`}
        title={!isConnected ? 'Connect wallet to create groups' : 'Create New Group'}
      >
        Create New Group
      </button>
    )
  }

  return (
    <div className="p-4 border rounded-xl bg-white space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Create New Group</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {!isConnected && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Please connect your wallet to create a group
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Group Name</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name..."
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Select Members</label>
          <div className="grid grid-cols-2 gap-2">
            {availableMembers.map((member) => (
              <label key={member.address} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(member.address)}
                  onChange={() => toggleMember(member.address)}
                  className="rounded"
                />
                <span className="text-sm">{member.name}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Selected: {selectedMembers.length} members
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!isConnected || busy || isConfirming || !groupName.trim() || selectedMembers.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-gray-400"
          >
            {busy && !txHash ? 'Creating...' :
             isConfirming ? 'Confirming...' :
             isConfirmed ? 'Waiting for indexing...' :
             'Create Group'}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}