"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Search, Home, FileText, Plus, Users, UserCheck } from "lucide-react"

// Hardcoded demo data for expenses
const expenseData = [
  { name: "Shopping", value: 120, color: "var(--color-chart-1)" },
  { name: "Food", value: 90, color: "var(--color-chart-2)" },
  { name: "Travel", value: 60, color: "var(--color-chart-3)" },
  { name: "Entertainment", value: 45, color: "var(--color-chart-4)" },
  { name: "Bills", value: 35, color: "var(--color-chart-5)" },
]

const totalExpenses = expenseData.reduce((sum, item) => sum + item.value, 0)

export default function DashboardPage() {
  const [isWalletConnected, setIsWalletConnected] = useState(true) // Demo state
  const [searchQuery, setSearchQuery] = useState("")

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Balance - Larger Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Total Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">$1,247.50</div>
              <p className="text-sm text-muted-foreground mt-1">Available balance</p>
            </CardContent>
          </Card>

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

        {/* Expense Visualization Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Circular Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-foreground">All Time Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  shopping: { label: "Shopping", color: "var(--color-chart-1)" },
                  food: { label: "Food", color: "var(--color-chart-2)" },
                  travel: { label: "Travel", color: "var(--color-chart-3)" },
                  entertainment: { label: "Entertainment", color: "var(--color-chart-4)" },
                  bills: { label: "Bills", color: "var(--color-chart-5)" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expenseData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">${item.value}</div>
                      <div className="text-sm text-muted-foreground">
                        {((item.value / totalExpenses) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="font-bold text-primary">${totalExpenses}</span>
                </div>
              </div>
            </CardContent>
          </Card>
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
