// Demo wallet addresses for testing member functionality
export const DEMO_WALLETS = [
  {
    address: '0x1234567890123456789012345678901234567890',
    name: 'Alice',
    displayName: 'alice.eth',
    avatar: '👩‍💼'
  },
  {
    address: '0x2345678901234567890123456789012345678901',
    name: 'Bob',
    displayName: 'bob.eth',
    avatar: '👨‍💻'
  },
  {
    address: '0x3456789012345678901234567890123456789012',
    name: 'Charlie',
    displayName: 'charlie.eth',
    avatar: '👨‍🎨'
  },
  {
    address: '0x4567890123456789012345678901234567890123',
    name: 'David',
    displayName: 'david.eth',
    avatar: '👨‍🔬'
  },
  {
    address: '0x5678901234567890123456789012345678901234',
    name: 'Eve',
    displayName: 'eve.eth',
    avatar: '👩‍🚀'
  },
  {
    address: '0x6789012345678901234567890123456789012345',
    name: 'Frank',
    displayName: 'frank.eth',
    avatar: '👨‍🏫'
  }
] as const

export const formatWalletAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const getWalletByAddress = (address: string) => {
  return DEMO_WALLETS.find(wallet => wallet.address.toLowerCase() === address.toLowerCase())
}

export const getWalletDisplayName = (address: string): string => {
  const wallet = getWalletByAddress(address)
  return wallet ? wallet.displayName : formatWalletAddress(address)
}