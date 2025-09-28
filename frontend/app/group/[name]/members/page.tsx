'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ArrowLeft, Settings, Plus, MessageCircle, Info, X } from 'lucide-react'

// Mock data for group members (replacing subgraph)
const mockGroupMembers = {
  'Weekend Trip': [
    { id: '0x1234567890123456789012345678901234567890', username: 'alice', joinedAt: '2024-01-15' },
    { id: '0x2345678901234567890123456789012345678901', username: 'bob', joinedAt: '2024-01-16' },
    { id: '0x3456789012345678901234567890123456789012', username: 'charlie', joinedAt: '2024-01-17' },
  ],
  'Office Lunch': [
    { id: '0x1234567890123456789012345678901234567890', username: 'alice', joinedAt: '2024-01-10' },
    { id: '0x4567890123456789012345678901234567890123', username: 'david', joinedAt: '2024-01-11' },
    { id: '0x5678901234567890123456789012345678901234', username: 'eve', joinedAt: '2024-01-12' },
  ],
  'Roommate Expenses': [
    { id: '0x1234567890123456789012345678901234567890', username: 'alice', joinedAt: '2024-01-05' },
    { id: '0x6789012345678901234567890123456789012345', username: 'frank', joinedAt: '2024-01-06' },
  ]
}

export default function MembersPage() {
  const router = useRouter()
  const params = useParams<{ name: string }>()
  const name = decodeURIComponent(params.name)
  const { address: userAddress } = useAccount()

  const [showAddMember, setShowAddMember] = useState(false)
  const [memberUsername, setMemberUsername] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  // Get mock data for the group
  const members = mockGroupMembers[name as keyof typeof mockGroupMembers] || []

  const addMember = async () => {
    if (!userAddress || !memberUsername.trim()) return

    // Validate username format (3-20 characters, alphanumeric and hyphens only)
    if (!/^[a-zA-Z0-9-]{3,20}$/.test(memberUsername)) {
      alert('Username must be 3-20 characters long and contain only letters, numbers, and hyphens')
      return
    }

    // Check if member is already in the group
    if (members.some((m: any) => m.username.toLowerCase() === memberUsername.toLowerCase())) {
      alert('This username is already a member of the group')
      return
    }

    setAddingMember(true)
    try {
      // This would be a real contract call in production
      console.log('Adding member:', memberUsername, 'to group:', name)

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      alert('✅ Member added successfully!')
      setMemberUsername('')
      setShowAddMember(false)

      // In a real app, this would refresh the data from the contract
      // For now, we'll just close the modal
    } catch (error: any) {
      console.error('Failed to add member:', error)
      alert(`Failed to add member: ${error.message || 'Unknown error'}`)
    } finally {
      setAddingMember(false)
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
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
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-medium">Members</h1>
            <button className="p-2">
              <Settings className="w-6 h-6" />
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
                <h2 className="text-2xl font-semibold">{name}</h2>
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
                {member.username.charAt(0).toUpperCase()}
              </div>

              {/* Member Info */}
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  @{member.username}
                </div>
                <div className="text-sm text-gray-500">
                  {formatAddress(member.id)}
                </div>
                <div className="text-xs text-gray-400">
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Info className="w-5 h-5" />
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
            <Plus className="w-5 h-5" />
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
            onClick={() => router.push(`/add-expense?groupName=${encodeURIComponent(name)}&groupId=1`)}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <Plus className="w-6 h-6 text-white" />
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
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={memberUsername}
                    onChange={(e) => setMemberUsername(e.target.value)}
                    placeholder="e.g., alice, bob123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a valid username (3-20 characters, letters, numbers, and hyphens only)
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Note:</p>
                      <p>The member must be registered on the platform with this username. They will be able to participate in expenses and settlements in this group.</p>
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
                  disabled={!memberUsername.trim() || addingMember}
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