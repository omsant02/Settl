'use client'
import { useEffect, useState } from 'react'
import { urqlClient } from '@/lib/urql'

export function useSubgraph<T=any>(query: string, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const [refetchKey, setRefetchKey] = useState(0)

  const refetch = () => {
    setRefetchKey(prev => prev + 1)
  }

  useEffect(() => {
    // Skip execution if query is empty or invalid
    if (!query || query.trim() === '') {
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    urqlClient.query(query, {}).toPromise().then(res => {
      if (!mounted) return
      setData(res.data); setError(res.error); setLoading(false)
    })
    return () => { mounted = false }
  }, [...deps, refetchKey]) // eslint-disable-line
  return { data, loading, error, refetch }
}


