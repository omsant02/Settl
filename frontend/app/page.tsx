"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="font-sans font-bold text-xl text-foreground">Settl</h1>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a
                  href="#features"
                  className="text-foreground hover:text-primary transition-colors duration-200 px-3 py-2 text-sm font-medium"
                >
                  Features
                </a>
                <a
                  href="#pricing"
                  className="text-foreground hover:text-primary transition-colors duration-200 px-3 py-2 text-sm font-medium"
                >
                  Pricing
                </a>
                <a
                  href="#faq"
                  className="text-foreground hover:text-primary transition-colors duration-200 px-3 py-2 text-sm font-medium"
                >
                  FAQ
                </a>
              </div>
            </div>

            {/* Desktop Connect Wallet Button */}
            <div className="hidden md:block">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm transition-all duration-200">
                Connect Wallet
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-foreground hover:text-primary transition-colors duration-200"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-background border-t border-border">
              <a
                href="#features"
                className="text-foreground hover:text-primary block px-3 py-2 text-base font-medium transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-foreground hover:text-primary block px-3 py-2 text-base font-medium transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </a>
              <a
                href="#faq"
                className="text-foreground hover:text-primary block px-3 py-2 text-base font-medium transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                FAQ
              </a>
              <div className="px-3 py-2">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm transition-all duration-200">
                  Connect Wallet
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Hero Title */}
            <h1 className="font-sans font-bold text-4xl md:text-6xl text-foreground mb-6 animate-fade-in-up text-balance">
              Split expenses, transparently. On-chain, for everyone.
            </h1>

            {/* Hero Description */}
            <h2 className="font-sans text-xl md:text-2xl text-muted-foreground mb-8 animate-fade-in-up animation-delay-200 text-pretty">
              Track, settle, and share expenses seamlessly with blockchain-powered transparency.
            </h2>

            {/* CTA Button */}
            <div className="animate-fade-in-up animation-delay-400">
              <Button
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:scale-105 rounded-xl shadow-md transition-all duration-300 px-8 py-4 text-lg font-medium"
              >
                Connect Wallet
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
