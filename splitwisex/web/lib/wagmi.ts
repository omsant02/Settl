import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia, polygonAmoy } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'SplitwiseX',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'splitwisex-placeholder-id',
  chains: [sepolia, polygonAmoy],
  ssr: true, // For Next.js
})