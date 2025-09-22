'use client'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
// Simplified storage component - no longer uses encryption/secure storage

interface FilecoinStorageProps {
  cid: string
  onStatusChange?: (status: string, dealId?: string) => void
  className?: string
}

export default function FilecoinStorage({ cid, onStatusChange, className = '' }: FilecoinStorageProps) {
  const { address, isConnected } = useAccount()
  const [status, setStatus] = useState<'idle' | 'initializing' | 'depositing' | 'approving' | 'storing' | 'checking' | 'stored' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dealId, setDealId] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [synapse, setSynapse] = useState<any>(null)
  
  // Initialize Synapse SDK with connected wallet
  useEffect(() => {
    if (!isConnected || !window.ethereum) return
    
    const initSynapse = async () => {
      try {
        setStatus('initializing')
        setError(null)
        
        // Simplified - no longer using secure storage or synapse initialization
        console.log('FilecoinStorage simplified - ready for future integration')
        
        setStatus('idle')
      } catch (err: any) {
        console.error('Failed to initialize Synapse:', err)
        setError(err.message || 'Failed to initialize Synapse')
        setStatus('error')
      }
    }
    
    initSynapse()
  }, [isConnected, address])
  
  // Store CID on Filecoin
  const storeOnFilecoin = async () => {
    if (!synapse || !cid) return
    
    try {
      // Step 1: Check balance and deposit if needed
      setStatus('depositing')
      const { balance } = await synapse.payments.getBalance()
      
      if (BigInt(balance) < BigInt('100000000000000000')) { // 0.1 FIL
        await synapse.payments.deposit('100000000000000000') // Deposit 0.1 FIL
      }
      
      // Step 2: Approve service if needed
      setStatus('approving')
      await synapse.payments.approveService()
      
      // Step 3: Store CID on Filecoin
      setStatus('storing')
      const job = await synapse.storage.warmStorage(cid)
      setJobId(job.id)
      
      // Step 4: Check status periodically
      await checkJobStatus(job.id)
    } catch (err: any) {
      console.error('Failed to store on Filecoin:', err)
      setError(err.message || 'Failed to store on Filecoin')
      setStatus('error')
      if (onStatusChange) onStatusChange('failed')
    }
  }
  
  // Check job status
  const checkJobStatus = async (id: string) => {
    if (!synapse) return
    
    try {
      setStatus('checking')
      
      // Poll for status every 5 seconds
      const checkStatus = async () => {
        const jobStatus = await synapse.storage.getStatus(id)
        
        if (jobStatus.status === 'success' && jobStatus.dealId) {
          setDealId(jobStatus.dealId)
          setStatus('stored')
          if (onStatusChange) onStatusChange('stored', jobStatus.dealId)
          return true
        } else if (jobStatus.status === 'failed') {
          setError('Storage job failed')
          setStatus('error')
          if (onStatusChange) onStatusChange('failed')
          return true
        }
        
        return false
      }
      
      // Initial check
      const isComplete = await checkStatus()
      if (isComplete) return
      
      // Set up polling
      const interval = setInterval(async () => {
        const isComplete = await checkStatus()
        if (isComplete) {
          clearInterval(interval)
        }
      }, 5000)
      
      // Clean up interval after 5 minutes (prevent infinite polling)
      setTimeout(() => {
        clearInterval(interval)
        if (status === 'checking') {
          setStatus('idle')
        }
      }, 5 * 60 * 1000)
    } catch (err: any) {
      console.error('Failed to check job status:', err)
      setError(err.message || 'Failed to check job status')
      setStatus('error')
    }
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium mb-2">Filecoin Storage</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">IPFS CID:</div>
            <div className="text-sm font-mono">{cid.slice(0, 10)}...{cid.slice(-6)}</div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Status:</div>
            <div className={`text-sm ${
              status === 'stored' ? 'text-green-600' :
              status === 'error' ? 'text-red-600' :
              status !== 'idle' ? 'text-yellow-600' :
              'text-gray-600'
            }`}>
              {status === 'idle' ? 'Ready to store' :
               status === 'initializing' ? 'Initializing Synapse...' :
               status === 'depositing' ? 'Depositing funds...' :
               status === 'approving' ? 'Approving service...' :
               status === 'storing' ? 'Creating storage job...' :
               status === 'checking' ? 'Checking job status...' :
               status === 'stored' ? 'Stored on Filecoin' :
               'Error'}
            </div>
          </div>
          
          {dealId && (
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Deal ID:</div>
              <div className="text-sm font-mono">{dealId}</div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 p-3 rounded text-sm text-red-600">
              {error}
            </div>
          )}
          
          <div className="pt-2">
            <button
              onClick={storeOnFilecoin}
              disabled={!synapse || status !== 'idle' || !isConnected}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {status === 'idle' ? 'Store on Filecoin' : 'Processing...'}
            </button>
          </div>
          
          {status === 'stored' && (
            <div className="bg-green-50 p-3 rounded text-sm text-green-600">
              Successfully stored on Filecoin! This receipt is now permanently preserved.
            </div>
          )}
        </div>
      </div>
      
      <div className="text-xs text-gray-500">
        <p>Storing on Filecoin provides permanent decentralized storage for your receipt.</p>
        <p>This process requires a small amount of FIL for storage fees.</p>
      </div>
    </div>
  )
}
