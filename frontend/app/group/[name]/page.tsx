'use client'
import { useParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings, Plus, Users, DollarSign, Receipt, User, UserPlus } from 'lucide-react'
import AddMemberModal from '@/components/AddMemberModal'
import { getWalletDisplayName } from '@/lib/demo-wallets'

// Mock data for demo
const mockGroups: { [name: string]: any } = {
  'Weekend Trip': {
    id: '1',
    name: 'Weekend Trip',
    members: [
      { id: '0x1234567890123456789012345678901234567890', ensName: 'alice.eth' },
      { id: '0x2345678901234567890123456789012345678901', ensName: 'bob.eth' },
      { id: '0x3456789012345678901234567890123456789012', ensName: 'charlie.eth' },
    ]
  },
  'Office Lunch': {
    id: '2',
    name: 'Office Lunch',
    members: [
      { id: '0x1234567890123456789012345678901234567890', ensName: 'david.eth' },
      { id: '0x2345678901234567890123456789012345678901', ensName: 'eve.eth' },
    ]
  },
  'Roommate Expenses': {
    id: '3',
    name: 'Roommate Expenses',
    members: [
      { id: '0x1234567890123456789012345678901234567890', ensName: 'frank.eth' },
    ]
  }
}

const mockExpenses = [
  {
    id: '1',
    payer: { id: '0x1234567890123456789012345678901234567890' },
    amount: '50000000000000000000', // 50 ETH in wei
    token: '0x0000000000000000000000000000000000000000',
    memo: 'Dinner at restaurant',
    createdAt: '1703980800', // Recent timestamp
    cid: null
  },
  {
    id: '2',
    payer: { id: '0x2345678901234567890123456789012345678901' },
    amount: '1000000000', // 1000 USDC
    token: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
    memo: 'Gas for trip',
    createdAt: '1703894400',
    cid: null
  },
  {
    id: '3',
    payer: { id: '0x3456789012345678901234567890123456789012' },
    amount: '25000000000000000000', // 25 ETH
    token: '0x0000000000000000000000000000000000000000',
    memo: 'Movie tickets',
    createdAt: '1703808000',
    cid: null
  }
]

// Token configurations for display
const TOKEN_INFO: { [address: string]: { symbol: string; decimals: number } } = {
  '0x0000000000000000000000000000000000000000': { symbol: 'ETH', decimals: 18 },
  '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': { symbol: 'USDC', decimals: 6 }
}

// Mock ENS component
const ENSName = ({ address }: { address: string }) => {
  const mockNames: { [key: string]: string } = {
    '0x1234567890123456789012345678901234567890': 'alice.eth',
    '0x2345678901234567890123456789012345678901': 'bob.eth',
    '0x3456789012345678901234567890123456789012': 'charlie.eth'
  }
  return <span>{mockNames[address] || `${address.slice(0, 6)}...${address.slice(-4)}`}</span>
}

// Helper function to format token amounts
const formatTokenAmount = (amount: string, tokenAddress: string): string => {
  const token = TOKEN_INFO[tokenAddress.toLowerCase()] || { symbol: 'TOKEN', decimals: 18 }
  const amountNum = Number(amount) / Math.pow(10, token.decimals)
  return token.symbol === 'ETH'
    ? `${amountNum.toFixed(6)} ${token.symbol}`
    : `${amountNum.toFixed(2)} ${token.symbol}`
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
  const router = useRouter()
  const name = params?.name ? decodeURIComponent(params.name) : ''
  const { address: userAddress } = useAccount()

  const [group, setGroup] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)

  // Load group from localStorage
  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const storedGroups = localStorage.getItem('settl-groups')
      if (storedGroups) {
        try {
          const groups = JSON.parse(storedGroups)
          const foundGroup = groups.find((g: any) => g.name === name)
          if (foundGroup) {
            setGroup(foundGroup)
          } else {
            // Fallback to mock data
            const mockGroup = mockGroups[name]
            if (mockGroup) {
              setGroup(mockGroup)
            }
          }
        } catch (error) {
          console.error('Error loading group:', error)
        }
      } else {
        // Fallback to mock data
        const mockGroup = mockGroups[name]
        if (mockGroup) {
          setGroup(mockGroup)
        }
      }
    }
  }, [name])

  // Handle member addition
  const handleMemberAdded = (newMember: { address: string; displayName: string }) => {
    console.log('🔄 Adding member to group:', newMember)

    if (!group) return

    // Update local group state
    const updatedGroup = {
      ...group,
      members: [...group.members, newMember.displayName]
    }
    setGroup(updatedGroup)

    // Update localStorage
    if (typeof window !== 'undefined') {
      const storedGroups = localStorage.getItem('settl-groups')
      if (storedGroups) {
        try {
          const groups = JSON.parse(storedGroups)
          const groupIndex = groups.findIndex((g: any) => g.name === name)
          if (groupIndex !== -1) {
            groups[groupIndex] = updatedGroup
            localStorage.setItem('settl-groups', JSON.stringify(groups))
            console.log('💾 Group updated in localStorage with new member')
          }
        } catch (error) {
          console.error('Error updating group with new member:', error)
        }
      }
    }
  }

  // Use mock data
  const expensesData = { expenses: mockExpenses }
  const expensesLoading = false

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">Group not found</h2>
              <p className="text-muted-foreground mb-4">
                Looking for group: <strong>{name}</strong>
              </p>
              <Button onClick={() => router.push('/dashboard')} variant="outline">
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button onClick={() => router.push('/dashboard')} className="p-2">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">{group.name}</h1>
          <button className="p-2">
            <Settings className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Group Info Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{group.name}</CardTitle>
                <p className="text-muted-foreground">{group.members.length} members</p>
              </div>
              <Button
                onClick={() => setIsAddMemberModalOpen(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Member
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Button
            onClick={() => router.push(`/add-expense?groupName=${encodeURIComponent(name)}&groupId=${group.id}`)}
            className="flex flex-col gap-2 h-auto py-4"
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm">Add Expense</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/group/${encodeURIComponent(name)}/balances`)}
            className="flex flex-col gap-2 h-auto py-4"
          >
            <DollarSign className="w-6 h-6" />
            <span className="text-sm">Balances</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/group/${encodeURIComponent(name)}/members`)}
            className="flex flex-col gap-2 h-auto py-4"
          >
            <User className="w-6 h-6" />
            <span className="text-sm">Members</span>
          </Button>
        </div>

        {/* Group Members */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Members ({group.members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.members.map((member: string, index: number) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      {getWalletDisplayName(member)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member === "You" ? "Creator" : "Member"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Recent Expenses</h2>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>

          {expensesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading expenses...</div>
          ) : expensesData?.expenses?.length > 0 ? (
            <div className="space-y-3">
              {expensesData.expenses.map((expense: any) => {
                const date = formatDate(expense.createdAt)
                const isPayer = expense.payer.id.toLowerCase() === userAddress?.toLowerCase()
                const categoryType = expense.memo?.toLowerCase() || ''

                // Category icons
                let categoryIcon = <Receipt className="w-5 h-5" />

                if (categoryType.includes('food') || categoryType.includes('restaurant') || categoryType.includes('dinner')) {
                  categoryIcon = <span className="text-lg">🍕</span>
                } else if (categoryType.includes('gas') || categoryType.includes('fuel')) {
                  categoryIcon = <span className="text-lg">⛽</span>
                } else if (categoryType.includes('movie') || categoryType.includes('entertainment')) {
                  categoryIcon = <span className="text-lg">🎬</span>
                }

                return (
                  <Card key={expense.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                            {categoryIcon}
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">{expense.memo}</h3>
                            <p className="text-sm text-muted-foreground">
                              Paid by <ENSName address={expense.payer.id} />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {date.month} {date.day}, {date.year}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${isPayer ? 'text-green-600' : 'text-orange-600'}`}>
                            {formatTokenAmount(expense.amount, expense.token)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {isPayer ? 'You paid' : 'You owe'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No expenses yet</h3>
                <p className="text-muted-foreground mb-4">Start by adding your first expense to the group.</p>
                <Button
                  onClick={() => router.push(`/add-expense?groupName=${encodeURIComponent(name)}&groupId=${group.id}`)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        groupId={group.id}
        groupName={group.name}
        currentMembers={group.members}
        onMemberAdded={handleMemberAdded}
      />
    </div>
  )
}