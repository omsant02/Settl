"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { ArrowUpRight, Wallet, ChevronDown, Copy, ExternalLink, LogOut } from "lucide-react"
import { useAccount, useBalance, useDisconnect } from 'wagmi'
import "./CardNav.css"

type CardNavLink = {
  label: string
  href?: string
  ariaLabel: string
}

export type CardNavItem = {
  label: string
  bgColor: string
  textColor: string
  links: CardNavLink[]
}

export interface CardNavProps {
  logoText: string
  items: CardNavItem[]
  className?: string
  ease?: string
  baseColor?: string
  menuColor?: string
  buttonBgColor?: string
  buttonTextColor?: string
}

const CardNav: React.FC<CardNavProps> = ({
  logoText,
  items,
  className = "",
  ease = "power3.out",
  baseColor = "#fff",
  menuColor,
  buttonBgColor,
  buttonTextColor,
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false)
  const navRef = useRef<HTMLDivElement | null>(null)

  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address })
  const { disconnect } = useDisconnect()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}…${addr.slice(-4)}`
  }

  const formatBalance = (bal: any) => {
    if (!bal) return '0.000 ETH'
    return `${parseFloat(bal.formatted).toFixed(3)} ${bal.symbol}`
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setIsWalletDropdownOpen(false) // Close dropdown after copying
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsWalletDropdownOpen(false)
      }
    }

    if (isWalletDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isWalletDropdownOpen])

  const toggleMenu = () => {
    console.log("[v0] Toggling menu, current state:", { isHamburgerOpen, isExpanded })
    setIsHamburgerOpen(!isHamburgerOpen)
    setIsExpanded(!isExpanded)
  }

  const getNavHeight = () => {
    if (!isExpanded) return "60px"
    // Base height (60px) + content padding + card heights
    const baseHeight = 60
    const contentPadding = 16 // 0.5rem * 2
    const cardHeight = 120 // Approximate height for each card
    const gap = 12 * (items.length - 1) // Gap between cards
    return `${baseHeight + contentPadding + cardHeight + gap}px`
  }

  return (
    <div className={`card-nav-container ${className}`}>
      <nav
        ref={navRef}
        className={`card-nav ${isExpanded ? "open" : ""}`}
        style={{
          backgroundColor: baseColor,
          height: getNavHeight(),
          transition: "height 0.4s ease",
        }}
      >
        <div className="card-nav-top">
          <div
            className={`hamburger-menu ${isHamburgerOpen ? "open" : ""}`}
            onClick={toggleMenu}
            role="button"
            aria-label={isExpanded ? "Close menu" : "Open menu"}
            tabIndex={0}
            style={{ color: menuColor || "#000" }}
          >
            <div className="hamburger-line" />
            <div className="hamburger-line" />
          </div>

          <div className="logo-container flex-1 flex justify-center">
            <span className="logo text-2xl font-bold">{logoText}</span>
          </div>

          {isConnected && address ? (
            <div className="relative ml-auto">
              <button
                type="button"
                className="flex items-center gap-3 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
                onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
                style={{ color: "#000" }}
              >
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Wallet className="w-3 h-3 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-gray-500">Sepolia</div>
                  <div className="text-sm font-medium">{formatBalance(balance)}</div>
                  <div className="text-xs text-gray-400">{formatAddress(address)}</div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${isWalletDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isWalletDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-3">
                    <div className="text-sm font-medium text-gray-900 mb-3">Wallet Options</div>
                    <div className="space-y-1">
                      <button
                        onClick={copyAddress}
                        className="w-full flex items-center gap-2 p-2 text-sm hover:bg-gray-50 rounded-md text-left"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Address
                      </button>
                      <button className="w-full flex items-center gap-2 p-2 text-sm hover:bg-gray-50 rounded-md text-left">
                        <ExternalLink className="w-4 h-4" />
                        View on Explorer
                      </button>
                      <button
                        onClick={() => disconnect()}
                        className="w-full flex items-center gap-2 p-2 text-sm hover:bg-gray-50 rounded-md text-red-600 text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="card-nav-cta-button ml-auto"
              style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}
            >
              Connect Wallet
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="card-nav-content" aria-hidden={!isExpanded}>
            {(items || []).slice(0, 3).map((item, idx) => (
              <div
                key={`${item.label}-${idx}`}
                className="nav-card"
                style={{
                  backgroundColor: item.bgColor,
                  color: item.textColor,
                  opacity: isExpanded ? 1 : 0,
                  transform: isExpanded ? "translateY(0)" : "translateY(20px)",
                  transition: `all 0.4s ease ${idx * 0.1}s`,
                }}
              >
                <div className="nav-card-label">{item.label}</div>
                <div className="nav-card-links">
                  {item.links?.map((lnk, i) => (
                    <a
                      key={`${lnk.label}-${i}`}
                      className="nav-card-link"
                      href={lnk.href || "#"}
                      aria-label={lnk.ariaLabel}
                    >
                      <ArrowUpRight className="nav-card-link-icon w-4 h-4" aria-hidden="true" />
                      {lnk.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>
    </div>
  )
}

export default CardNav
