export const domain = (chainId:number, verifyingContract:string) => ({
  name: 'SplitwiseX', version: '1', chainId, verifyingContract: verifyingContract as `0x${string}`
})
export const types = {
  SettleIntent: [
    { name: 'groupId', type: 'uint256' },
    { name: 'debtor', type: 'address' },
    { name: 'creditor', type: 'address' },
    { name: 'srcChainId', type: 'uint256' },
    { name: 'dstChainId', type: 'uint256' },
    { name: 'tokenIn', type: 'address' },
    { name: 'tokenOut', type: 'address' },
    { name: 'amountOutMin', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'routeId', type: 'string' },
    { name: 'edgeIdsHash', type: 'bytes32' },
  ],
  SettlementReceipt: [
    { name: 'groupId', type: 'uint256' },
    { name: 'debtor', type: 'address' },
    { name: 'creditor', type: 'address' },
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'dstChainId', type: 'uint256' },
    { name: 'dstTxHash', type: 'bytes32' },
    { name: 'settleIntentHash', type: 'bytes32' },
  ]
}


