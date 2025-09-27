'use client'
import { useParams, useRouter } from 'next/navigation'
import { useSubgraph } from '@/hooks/useSubgraph'
import { GET_GROUP_BY_NAME } from '@/lib/queries'
import ENSName from '@/components/ENSName'
import { useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import Ledger from '@/abis/Ledger.json'

export default function MembersPage() {
  const router = useRouter()
  const params = useParams<{ name: string }>()
  const name = decodeURIComponent(params?.name || '')
  const { data, loading, error } = useSubgraph<any>(GET_GROUP_BY_NAME(name), [name])
  const { address: userAddress } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const [showAddMember, setShowAddMember] = useState(false)
  const [memberAddress, setMemberAddress] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  const group = data?.groups?.[0]
  const members = group?.members || []
  const groupId = group?.id

  const addMember = async () => {
    if (!userAddress || !groupId || !memberAddress) return

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(memberAddress)) {
      alert('Please enter a valid Ethereum address')
      return
    }

    // Check if member is already in the group
    if (members.some((m: any) => m.id.toLowerCase() === memberAddress.toLowerCase())) {
      alert('This address is already a member of the group')
      return
    }

    setAddingMember(true)
    try {
      const contractAddr = process.env.NEXT_PUBLIC_LEDGER_ADDRESS as `0x${string}`

      await writeContractAsync({
        address: contractAddr,
        abi: Ledger.abi,
        functionName: 'addMember',
        args: [BigInt(groupId), memberAddress as `0x${string}`]
      })

      alert('Member added successfully!')
      setMemberAddress('')
      setShowAddMember(false)

      // Refresh the page to show updated members
      window.location.reload()
    } catch (error: any) {
      console.error('Failed to add member:', error)
      alert(`Failed to add member: ${error.message || 'Unknown error'}`)
    } finally {
      setAddingMember(false)
    }
  }

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
            <h1 className="text-xl font-medium">Members</h1>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{group.name || `Group #${group.id}`}</h2>
                <p className="text-blue-100">{members.length} member{members.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {members.map((member: any, index: number) => (
            <div key={member.id} className="flex items-center space-x-4 p-4 bg-white border rounded-lg hover:bg-gray-50 transition-colors">
              {/* Avatar */}
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                {index + 1}
              </div>

              {/* Member Info */}
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  <ENSName address={member.id} />
                </div>
                <div className="text-sm text-gray-500">
                  {member.id.slice(0, 6)}...{member.id.slice(-4)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Member Button */}
        <div className="mt-6">
          <button
            onClick={() => setShowAddMember(true)}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t bg-white">
        <div className="flex items-end justify-between px-6 py-3">
          <button
            onClick={() => router.push(`/group/${name}`)}
            className="flex flex-col items-center gap-1"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7z" />
            </svg>
            <span className="text-xs">Overview</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs text-green-600">People</span>
          </button>
          <button
            onClick={() => router.push(`/group/${name}`)}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <span className="text-xs">Add expense</span>
          </button>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Add Member</h2>
                <button
                  onClick={() => setShowAddMember(false)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Member Wallet Address
                  </label>
                  <input
                    type="text"
                    value={memberAddress}
                    onChange={(e) => setMemberAddress(e.target.value)}
                    placeholder="0x1234...abcd"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a valid Ethereum wallet address (42 characters starting with 0x)
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Note:</p>
                      <p>The member will be able to participate in expenses and settlements in this group. Make sure you have the correct wallet address.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddMember(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addMember}
                  disabled={!memberAddress || addingMember}
                  className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                >
                  {addingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}