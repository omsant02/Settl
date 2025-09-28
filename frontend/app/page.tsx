"use client"

import CardNav from "@/components/ui/CardNav"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { WalletConnectionHandler } from "@/components/WalletConnectionHandler"
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { isConnected } = useAccount()
  const router = useRouter()

  const handleGetStarted = () => {
    if (isConnected) {
      router.push('/dashboard')
    } else {
      // If not connected, the button will show ConnectButton modal
      // The WalletConnectionHandler will handle the redirect after connection
    }
  }

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
      <WalletConnectionHandler />
      <CardNav
        logoText="Settl"
        items={navItems}
        baseColor="hsl(var(--background))"
        menuColor="hsl(var(--foreground))"
        buttonBgColor="hsl(var(--foreground))"
        buttonTextColor="hsl(var(--background))"
      />

      {/* Hero Section */}
      <main className="flex-1 pt-20">
        <div className="relative min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="font-bold text-4xl md:text-6xl text-foreground mb-6 text-balance">
              Split expenses, transparently. Cross-Chain, for everyone.
            </h1>
            <h2 className="text-xl md:text-2xl text-muted-foreground mb-6 text-pretty">
              Track, settle, and share expenses seamlessly with blockchain-powered transparency.
            </h2>
            <div>
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 rounded-xl shadow-lg transition-all duration-300 px-8 py-4 text-lg font-medium group"
              >
                {isConnected ? 'Go to Dashboard' : 'Get Started'}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
