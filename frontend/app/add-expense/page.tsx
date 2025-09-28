'use client'
import { useState, useEffect, useRef } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera, ArrowLeft, Loader2, X, ChevronDown } from 'lucide-react'
import { SPLITWISE_CONTRACT_ADDRESS, SPLITWISE_CONTRACT_ABI } from '@/lib/contracts'

// Fixed to USD only - expenses tracked in USD

const categories = [
  { name: 'Food & Drink', icon: '🍕', color: 'bg-orange-100 text-orange-600' },
  { name: 'Transportation', icon: '🚗', color: 'bg-blue-100 text-blue-600' },
  { name: 'Entertainment', icon: '🎬', color: 'bg-purple-100 text-purple-600' },
  { name: 'Shopping', icon: '🛒', color: 'bg-green-100 text-green-600' },
  { name: 'Bills & Utilities', icon: '📄', color: 'bg-gray-100 text-gray-600' },
  { name: 'Travel', icon: '✈️', color: 'bg-cyan-100 text-cyan-600' },
  { name: 'Healthcare', icon: '🏥', color: 'bg-red-100 text-red-600' },
  { name: 'Other', icon: '📝', color: 'bg-yellow-100 text-yellow-600' }
]

export default function AddExpensePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { address, isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const [groupId, setGroupId] = useState<string>('')
  const [groupName, setGroupName] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(categories[0])
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [receiptPreview, setReceiptPreview] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txHash, setTxHash] = useState<string>('')

  // Wait for transaction confirmation
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}`,
  })

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const gId = urlParams.get('groupId')
    const gName = urlParams.get('groupName')
    if (gId) {
      setGroupId(gId)
      setGroupName(gName || `Group #${gId}`)
    }
  }, [])

  // Handle successful transaction confirmation
  useEffect(() => {
    if (isConfirmed && txHash) {
      alert('✅ Expense added successfully!')
      setIsSubmitting(false)
      setTxHash('')
      router.back()
    }
  }, [isConfirmed, txHash, router])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setReceiptPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCameraClick = () => {
    fileInputRef.current?.click()
  }

  const removeReceipt = () => {
    setReceiptPreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || !description.trim()) {
      alert('Please fill in all required fields')
      return
    }

    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }

    if (!groupId) {
      alert('Group ID not found')
      return
    }

    setIsSubmitting(true)

    try {
      // Convert USD amount to a standardized format (using 6 decimals like USDC)
      const amountInBaseUnits = BigInt(Math.floor(parseFloat(amount) * 1e6))

      // For now, only include the creator as a participant (can be enhanced later)
      const participants = [address]

      const txHash = await writeContractAsync({
        address: SPLITWISE_CONTRACT_ADDRESS as `0x${string}`,
        abi: SPLITWISE_CONTRACT_ABI,
        functionName: 'addExpense',
        args: [
          BigInt(groupId),
          amountInBaseUnits,
          description,
          participants
        ]
      })

      console.log('Transaction submitted:', txHash)
      setTxHash(txHash)

    } catch (error: any) {
      console.error('Failed to add expense:', error)
      alert(`Failed to add expense: ${error.message || 'Unknown error'}`)
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    router.back()
  }

  return (
    <div className="fixed inset-0 bg-white z-50">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center">
          <button onClick={handleClose} className="mr-3">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Add Expense</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
            {/* Group Info */}
            <div className="text-center mb-6">
              <p className="text-gray-600 mb-2">Adding expense for:</p>
              <p className="font-semibold text-lg">{groupName}</p>
            </div>

            {/* Amount (USD only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (USD) *
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1"
                  required
                />
                <div className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 bg-gray-50">
                  <span>$</span>
                  <span>USD</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this expense for?"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-3 bg-white text-left"
                >
                  <span className={`px-2 py-1 rounded-full text-sm ${selectedCategory.color}`}>
                    {selectedCategory.icon}
                  </span>
                  <span className="flex-1">{selectedCategory.name}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showCategoryDropdown && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {categories.map((category) => (
                      <button
                        key={category.name}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(category)
                          setShowCategoryDropdown(false)
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                      >
                        <span className={`px-2 py-1 rounded-full text-sm ${category.color}`}>
                          {category.icon}
                        </span>
                        <span>{category.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Receipt Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Receipt
              </label>

              {receiptPreview ? (
                <div className="relative">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="w-full h-32 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={removeReceipt}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCameraClick}
                  className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-gray-400 transition-colors"
                >
                  <Camera className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-500">Add receipt photo</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || !isConnected}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {txHash ? 'Confirming...' : 'Adding Expense...'}
                </>
              ) : (
                'Add Expense'
              )}
            </Button>

            {!isConnected && (
              <p className="text-center text-sm text-red-600">
                Please connect your wallet to add expenses
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {showCategoryDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowCategoryDropdown(false)
          }}
        />
      )}
    </div>
  )
}