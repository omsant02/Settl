"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Home, FileText, Plus, Users, UserCheck, Calendar, DollarSign } from "lucide-react"

// Hardcoded demo data for groups
const activeGroups = [
  {
    id: 1,
    name: "Weekend Trip",
    members: ["You", "alice.eth", "bob.eth", "charlie.eth"],
    totalExpenses: 1250.0,
    yourBalance: -320.5,
    lastActivity: "2 hours ago",
  },
  {
    id: 2,
    name: "Office Lunch",
    members: ["You", "david.eth", "eve.eth"],
    totalExpenses: 85.5,
    yourBalance: 15.25,
    lastActivity: "1 day ago",
  },
  {
    id: 3,
    name: "Roommate Expenses",
    members: ["You", "frank.eth"],
    totalExpenses: 450.0,
    yourBalance: -125.0,
    lastActivity: "3 days ago",
  },
]

export default function DashboardPage() {
  const [isWalletConnected, setIsWalletConnected] = useState(true) // Demo state
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter() // Added router for navigation

  const handleGroupClick = (groupId: number) => {
    router.push(`/groups/${groupId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <nav className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="font-sans font-bold text-xl text-foreground">Settl</h1>
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

          {/* Connect Wallet / ENS Name */}
          <div className="flex-shrink-0">
            {isWalletConnected ? (
              <div className="text-foreground font-medium">pratik.settl.eth</div>
            ) : (
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                onClick={() => setIsWalletConnected(true)}
              >
                Connect Wallet
              </Button>
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
            {activeGroups.map((group) => (
              <Card
                key={group.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleGroupClick(group.id)} // Added click handler for navigation
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
          <button className="bg-accent text-accent-foreground rounded-full p-3 shadow-md hover:shadow-lg transition-all hover:scale-105">
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
    </div>
  )
}
