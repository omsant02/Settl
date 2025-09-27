"use client"

import type React from "react"
import { useRef, useState } from "react"
import { ArrowUpRight, Zap } from "lucide-react"
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
  logoAlt?: string
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
  logoAlt = "Logo",
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
  const navRef = useRef<HTMLDivElement | null>(null)

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

          <div className="logo-container">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-md flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="logo text-2xl font-bold">{logoText}</span>
          </div>

          <button
            type="button"
            className="card-nav-cta-button"
            style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}
          >
            Get Started
          </button>
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
