'use client'
import { useEffect, useState } from 'react'
import { addressToName, ensAvatar } from '@/lib/ens'

export default function ENSName({ address }: { address: string }) {
  const [name, setName] = useState<string>(address)
  const [avatar, setAvatar] = useState<string | null>(null)
  useEffect(() => {
    ;(async () => {
      const n = await addressToName(address)
      setName(n)
      const av = await ensAvatar(n)
      setAvatar(av)
    })()
  }, [address])
  return (
    <span className="inline-flex items-center gap-2">
      {avatar && <img src={avatar} alt="ens" className="w-5 h-5 rounded-full"/>}
      <span className="font-medium">{name}</span>
    </span>
  )
}


