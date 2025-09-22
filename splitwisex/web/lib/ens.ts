import { createPublicClient, http, isAddress } from 'viem'
import { mainnet } from 'viem/chains'
const client = createPublicClient({ chain: mainnet, transport: http() })

// Mock ENS names for test addresses
const mockENSNames: Record<string, string> = {
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc': 'alice.eth',
  '0x8bc38e23a9f42ecd0216d4724dc5f3c7ce91962a': 'bob.eth',
  '0x90f79bf6eb2c4f870365e785982e1f101e93b906': 'charlie.eth',
  '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65': 'dave.eth',
  '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc': 'eve.eth',
  '0x976ea74026e726554db657fa54763abd0c3a0aa9': 'frank.eth',
  '0x14dc79964da2c08b23698b3d3cc7ca32193d9955': 'grace.eth',
  '0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f': 'henry.eth',
}

// Mock avatars for test addresses
const mockAvatars: Record<string, string> = {
  'alice.eth': 'https://api.dicebear.com/9.x/personas/svg?seed=alice&backgroundColor=b6e3f4',
  'bob.eth': 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob&backgroundColor=ddd6fe&clothing=hoodie&clothingColor=059669&eyes=default&eyebrows=defaultNatural&mouth=default&skin=fd9841&hair=shortHairShortFlat&hairColor=4c1d95',
  'vitalik.eth': 'https://api.dicebear.com/9.x/personas/svg?seed=vitalik&backgroundColor=f3e8ff',
  'charlie.eth': 'https://api.dicebear.com/9.x/personas/svg?seed=charlie&backgroundColor=fef3c7',
  'dave.eth': 'https://api.dicebear.com/9.x/personas/svg?seed=dave&backgroundColor=dcfce7',
  'eve.eth': 'https://api.dicebear.com/9.x/personas/svg?seed=eve&backgroundColor=fce7f3',
  'frank.eth': 'https://api.dicebear.com/9.x/personas/svg?seed=frank&backgroundColor=e0f2fe',
  'grace.eth': 'https://api.dicebear.com/9.x/personas/svg?seed=grace&backgroundColor=f1f5f9',
  'henry.eth': 'https://api.dicebear.com/9.x/personas/svg?seed=henry&backgroundColor=fef2f2',
}

export async function addressToName(addr: string) {
  if (!isAddress(addr)) return addr

  // Check mock names first
  const lowerAddr = addr.toLowerCase()
  if (mockENSNames[lowerAddr]) {
    return mockENSNames[lowerAddr]
  }

  // For development, just return the formatted address instead of making external calls
  // This avoids CORS issues during development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Fall back to real ENS resolution only in production
  try {
    const name = await client.getEnsName({ address: addr as `0x${string}` })
    return name ?? `${addr.slice(0, 6)}...${addr.slice(-4)}`
  } catch {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }
}

export async function ensAvatar(nameOrAddr: string) {
  const name = nameOrAddr.endsWith('.eth') ? nameOrAddr : await addressToName(nameOrAddr)

  // Check mock avatars first
  if (name && mockAvatars[name]) {
    return mockAvatars[name]
  }

  // Skip avatar resolution in development to avoid CORS issues
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return null
  }

  // Fall back to real ENS avatar resolution only in production
  try {
    const avatar = name && name.endsWith('.eth')
      ? await client.getEnsAvatar({ name })
      : null
    return avatar as string | null
  } catch {
    return null
  }
}


