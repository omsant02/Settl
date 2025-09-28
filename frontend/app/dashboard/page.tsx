"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAccount, useBalance, useDisconnect } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Home, FileText, Plus, Users, UserCheck, Calendar, DollarSign, ChevronDown, Copy, LogOut } from "lucide-react"
import CreateGroupModal from "@/components/CreateGroupModal"

// Hardcoded demo data for groups
const activeGroups = [
  {
    id: 1,
    name: "Weekend Trip",
    members: ["You", "alice.eth", "bob.eth", "charlie.eth"],
    totalExpenses: 1250.0,
    yourBalance: -320.5,
    lastActivity: "2 hours ago",
    createdAt: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
  },
  {
    id: 2,
    name: "Office Lunch",
    members: ["You", "david.eth", "eve.eth"],
    totalExpenses: 85.5,
    yourBalance: 15.25,
    lastActivity: "1 day ago",
    createdAt: Date.now() - (5 * 24 * 60 * 60 * 1000), // 5 days ago
  },
  {
    id: 3,
    name: "Roommate Expenses",
    members: ["You", "frank.eth"],
    totalExpenses: 450.0,
    yourBalance: -125.0,
    lastActivity: "3 days ago",
    createdAt: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
  },
]

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  // Initialize groups from localStorage or use default groups
  const [groups, setGroups] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedGroups = localStorage.getItem('settl-groups')
      if (storedGroups) {
        try {
          const parsed = JSON.parse(storedGroups)
          return parsed.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))
        } catch (error) {
          console.error('Error parsing stored groups:', error)
        }
      }
    }
    return [...activeGroups].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  })
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const router = useRouter() // Added router for navigation

  // Real wallet connection
  const { address, isConnected, isConnecting } = useAccount()
  const { data: balance } = useBalance({ address })
  const { disconnect } = useDisconnect()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Save groups to localStorage whenever groups change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('settl-groups', JSON.stringify(groups))
      console.log('💾 Groups saved to localStorage:', groups.length)
    }
  }, [groups, mounted])

  // Helper function to format address
  const formatAddress = (addr: string | undefined) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Helper function to format balance
  const formatBalance = (bal: any) => {
    if (!bal) return '0.000 ETH'
    return `${parseFloat(bal.formatted).toFixed(3)} ${bal.symbol}`
  }

  const handleGroupClick = (groupName: string) => {
    router.push(`/group/${encodeURIComponent(groupName)}`)
  }

  const handleAddClick = () => {
    setIsCreateModalOpen(true)
  }

  const handleGroupCreated = (newGroup: {
    id: string | number;
    name: string;
    description: string;
    members: string[];
    totalExpenses: number;
    yourBalance: number;
    lastActivity: string;
    createdAt?: number;
  }) => {
    console.log('📝 Dashboard received new group:', newGroup)

    // Convert to the format expected by the dashboard
    const groupData = {
      id: typeof newGroup.id === 'string' ? parseInt(newGroup.id) : newGroup.id,
      name: newGroup.name,
      members: newGroup.members,
      totalExpenses: newGroup.totalExpenses,
      yourBalance: newGroup.yourBalance,
      lastActivity: newGroup.lastActivity,
      createdAt: newGroup.createdAt || Date.now()
    }

    console.log('📝 Adding group to dashboard:', groupData)

    // Add new group at the beginning (top) of the list
    setGroups(prevGroups => {
      const updatedGroups = [groupData, ...prevGroups]
      // Sort by creation time, newest first
      const sortedGroups = updatedGroups.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      console.log('📝 Updated groups list:', sortedGroups.map(g => ({ id: g.id, name: g.name, createdAt: g.createdAt })))
      return sortedGroups
    })

    // Redirect to the newly created group
    console.log('📝 Redirecting to group:', `/group/${encodeURIComponent(newGroup.name)}`)
    router.push(`/group/${encodeURIComponent(newGroup.name)}`)
  }

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setIsDropdownOpen(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setIsDropdownOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <nav className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1
              className="font-sans font-bold text-xl text-foreground cursor-pointer hover:text-primary transition-colors"
              onClick={() => router.push('/')}
            >
              Settl
            </h1>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-input border-border rounded-lg"
              />
            </div>
          </div>

          {/* Connect Wallet / Wallet Info */}
          <div className="flex-shrink-0">
            {!mounted ? (
              // Show placeholder during hydration to prevent mismatch
              <div className="text-muted-foreground">
                <div className="text-sm">Loading...</div>
              </div>
            ) : isConnecting ? (
              <div className="text-muted-foreground">
                <div className="text-sm">Connecting...</div>
              </div>
            ) : isConnected && address ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="text-right hover:bg-muted/50 rounded-lg p-2 transition-colors flex items-center gap-2"
                >
                  <div>
                    <div className="text-foreground font-medium">{formatAddress(address)}</div>
                    <div className="text-sm text-muted-foreground">{formatBalance(balance)}</div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      <button
                        onClick={handleCopyAddress}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Address
                      </button>
                      <button
                        onClick={handleDisconnect}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}

                {isDropdownOpen && (
                  <div
                    className="fixed inset-0 z-0"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">
                <div className="text-sm">Wallet not connected</div>
                <div className="text-xs">Please connect in header</div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {/* Balance Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Amount to Get */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-foreground">Will Get</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-chart-2">$320.00</div>
              <p className="text-sm text-muted-foreground mt-1">From friends</p>
            </CardContent>
          </Card>

          {/* Amount to Pay */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-foreground">Will Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-chart-1">$180.50</div>
              <p className="text-sm text-muted-foreground mt-1">To friends</p>
            </CardContent>
          </Card>
        </div>

        {/* Currently Active Groups Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Currently Active Groups</h2>
            <Button
              variant="outline"
              size="sm"
              className="text-primary border-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
            >
              View All
            </Button>
          </div>

          <div className="space-y-4">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleGroupClick(group.name)} // Updated to use group name
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-foreground">{group.name}</h3>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">{group.members.length} members</span>
                      </div>

                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Total: ${group.totalExpenses.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{group.lastActivity}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm text-muted-foreground">Members:</span>
                        <div className="flex gap-1">
                          {group.members.slice(0, 3).map((member, index) => (
                            <span key={index} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                              {member}
                            </span>
                          ))}
                          {group.members.length > 3 && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                              +{group.members.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-lg font-semibold ${group.yourBalance >= 0 ? "text-chart-2" : "text-chart-1"}`}
                      >
                        {group.yourBalance >= 0 ? "+" : ""}${group.yourBalance.toFixed(2)}
                      </div>
                      <p className="text-sm text-muted-foreground">{group.yourBalance >= 0 ? "You get" : "You owe"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Home */}
          <button className="flex flex-col items-center gap-1 text-primary">
            <Home className="h-5 w-5" />
            <span className="text-xs font-medium">Home</span>
          </button>

          {/* Bills */}
          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <FileText className="h-5 w-5" />
            <span className="text-xs">Bills</span>
          </button>

          {/* Add Button (Center) */}
          <button
            onClick={handleAddClick}
            className="bg-accent text-accent-foreground rounded-full p-3 shadow-md hover:shadow-lg transition-all hover:scale-105"
          >
            <Plus className="h-6 w-6" />
          </button>

          {/* Groups */}
          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <Users className="h-5 w-5" />
            <span className="text-xs">Groups</span>
          </button>

          {/* Friends */}
          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <UserCheck className="h-5 w-5" />
            <span className="text-xs">Friends</span>
          </button>
        </div>
      </nav>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  )
}
