import { http, createConfig } from 'wagmi'
import { sepolia, polygonAmoy } from 'wagmi/chains'
import { injected, coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [sepolia, polygonAmoy],
  connectors: [
    // Generic injected for MetaMask and other wallets
    injected(),
    // Coinbase Wallet
    coinbaseWallet({
      appName: 'SplitwiseX',
    }),
  ],
  transports: {
    [sepolia.id]: http(),
    [polygonAmoy.id]: http()
  },
})
