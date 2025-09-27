"use client"

import CardNav from "@/components/ui/CardNav"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"

export default function HomePage() {
  const navItems = [
    {
      label: "Features",
      bgColor: "hsl(var(--primary))",
      textColor: "hsl(var(--primary-foreground))",
      links: [
        { label: "Expense Tracking", ariaLabel: "Learn about expense tracking", href: "#tracking" },
        { label: "Group Splitting", ariaLabel: "Learn about group splitting", href: "#splitting" },
      ],
    },
    {
      label: "How It Works",
      bgColor: "hsl(var(--secondary))",
      textColor: "hsl(var(--secondary-foreground))",
      links: [
        { label: "Getting Started", ariaLabel: "Getting started guide", href: "#getting-started" },
        { label: "Blockchain Benefits", ariaLabel: "Learn about blockchain benefits", href: "#blockchain" },
      ],
    },
    {
      label: "Support",
      bgColor: "hsl(var(--accent))",
      textColor: "hsl(var(--accent-foreground))",
      links: [
        { label: "Help Center", ariaLabel: "Visit help center", href: "#help" },
        { label: "Contact Us", ariaLabel: "Contact support", href: "#contact" },
        { label: "Community", ariaLabel: "Join community", href: "#community" },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-background relative">
      <CardNav
        logoText="Settl"
        logoAlt="Settl Logo"
        items={navItems}
        baseColor="hsl(var(--background))"
        menuColor="hsl(var(--foreground))"
        buttonBgColor="hsl(var(--foreground))"
        buttonTextColor="hsl(var(--background))"
      />

      {/* Hero Section */}
      <main className="flex-1 pt-32">
        <div className="relative min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="font-sans font-bold text-4xl md:text-6xl text-foreground mb-6 text-balance">
              Split expenses, transparently. On-chain, for everyone.
            </h1>
            <h2 className="font-sans text-xl md:text-2xl text-muted-foreground mb-8 text-pretty">
              Track, settle, and share expenses seamlessly with blockchain-powered transparency.
            </h2>
            <div>
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:from-primary/90 hover:to-secondary/90 hover:scale-105 rounded-xl shadow-lg transition-all duration-300 px-8 py-4 text-lg font-medium group"
              >
                <Wallet className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                Connect Wallet
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
