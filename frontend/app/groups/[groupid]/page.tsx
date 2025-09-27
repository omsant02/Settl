"use client"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Settings, Calendar, Plus, Users, UserCheck } from "lucide-react"

// Demo data for group details
const groupData = {
  1: {
    name: "Weekend Trip",
    totalOwed: 2823.33,
    members: [
      { name: "alice.eth", owes: 1721.67 },
      { name: "bob.eth", owes: 1101.66 },
    ],
    expenses: [
      {
        id: 1,
        date: "Jul 13",
        title: "Breakfast and softy",
        amount: 545.0,
        youLent: 363.33,
        icon: "🍽️",
        category: "food",
      },
      {
        id: 2,
        date: "Jul 13",
        title: "Khindsi",
        amount: 1430.0,
        youLent: 1080.0,
        icon: "🧾",
        category: "general",
      },
      {
        id: 3,
        date: "Jul 13",
        title: "Petrol",
        amount: 2000.0,
        youLent: 1000.0,
        icon: "⛽",
        category: "transport",
      },
      {
        id: 4,
        date: "Jul 13",
        title: "Toll and parking",
        amount: 570.0,
        youLent: 380.0,
        icon: "🅿️",
        category: "transport",
      },
    ],
  },
  2: {
    name: "Office Lunch",
    totalOwed: 15.25,
    members: [
      { name: "david.eth", owes: 10.25 },
      { name: "eve.eth", owes: 5.0 },
    ],
    expenses: [],
  },
  3: {
    name: "Roommate Expenses",
    totalOwed: -125.0,
    members: [{ name: "frank.eth", owes: -125.0 }],
    expenses: [],
  },
}

export default function GroupPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = Number.parseInt(params.groupid as string)
  const group = groupData[groupId as keyof typeof groupData]

  if (!group) {
    return <div>Group not found</div>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24">
        {/* Group Header */}
        <div className="text-center mb-8">
          {/* Group Icon */}
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>

          {/* Group Name */}
          <h1 className="text-3xl font-bold text-foreground mb-4">{group.name}</h1>

          {/* Balance Summary */}
          <div className="mb-4">
            <p className="text-lg text-foreground">
              You are owed <span className="text-chart-2 font-semibold">${Math.abs(group.totalOwed).toFixed(2)}</span>{" "}
              overall
            </p>
          </div>

          {/* Individual Balances */}
          <div className="space-y-2 mb-6">
            {group.members.map((member, index) => (
              <p key={index} className="text-foreground">
                {member.name} owes you <span className="text-chart-2 font-medium">${member.owes.toFixed(2)}</span>
              </p>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center mb-8">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white px-6">Settle up</Button>
            <Button variant="outline" className="px-6 bg-transparent">
              Charts
            </Button>
            <Button variant="outline" className="px-6 bg-transparent">
              Balances
            </Button>
            <Button variant="outline" className="px-6 bg-transparent">
              To
            </Button>
          </div>
        </div>

        {/* Expenses Section */}
        {group.expenses.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">July 2025</h2>
            <div className="space-y-4">
              {group.expenses.map((expense) => (
                <Card key={expense.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Date */}
                      <div className="text-center min-w-[50px]">
                        <div className="text-sm text-muted-foreground">{expense.date}</div>
                      </div>

                      {/* Icon */}
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-xl">
                        {expense.icon}
                      </div>

                      {/* Expense Details */}
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{expense.title}</h3>
                        <p className="text-sm text-muted-foreground">You paid ${expense.amount.toFixed(2)}</p>
                      </div>

                      {/* Amount Lent */}
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">you lent</div>
                        <div className="font-semibold text-foreground">${expense.youLent.toFixed(2)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Add Expense Button */}
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2">
          <Button
            className="bg-chart-2 hover:bg-chart-2/90 text-white px-8 py-3 rounded-full shadow-lg"
            onClick={() => router.push("/add-expense")}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add expense
          </Button>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button className="flex flex-col items-center gap-1 text-chart-2" onClick={() => router.push("/dashboard")}>
            <Users className="h-5 w-5" />
            <span className="text-xs font-medium">Groups</span>
          </button>

          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <UserCheck className="h-5 w-5" />
            <span className="text-xs">Friends</span>
          </button>

          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <Calendar className="h-5 w-5" />
            <span className="text-xs">Activity</span>
          </button>

          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <UserCheck className="h-5 w-5" />
            <span className="text-xs">Account</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
