'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

interface RevokeAccessFormProps {
  fileHash: string;
  onRevokeComplete?: (result: any) => void;
}

export default function RevokeAccessForm({ fileHash, onRevokeComplete }: RevokeAccessFormProps) {
  const [addressToRevoke, setAddressToRevoke] = useState<string>('');
  const [isRevoking, setIsRevoking] = useState<boolean>(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revokeSuccess, setRevokeSuccess] = useState<boolean>(false);
  const [revokeResult, setRevokeResult] = useState<any>(null);

  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      setRevokeError('Please connect your wallet to revoke access');
      return;
    }
    
    if (!fileHash) {
      setRevokeError('No file selected');
      return;
    }
    
    if (!addressToRevoke || !addressToRevoke.startsWith('0x')) {
      setRevokeError('Please enter a valid Ethereum address');
      return;
    }
    
    setIsRevoking(true);
    setRevokeError(null);
    setRevokeSuccess(false);
    setRevokeResult(null);
    
    try {
      console.log('🚫 Revoking access for file:', fileHash);
      console.log('👤 Owner:', address);
      console.log('🔄 Revoking access from:', addressToRevoke);
      
      // Step 1: Get authentication message
      console.log('📋 Getting auth message for revocation...');
      const authMessageResponse = await fetch('/api/lighthouse/auth-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: address })
      });
      
      if (!authMessageResponse.ok) {
        throw new Error(`Auth message request failed with status ${authMessageResponse.status}`);
      }
      
      const authMessageData = await authMessageResponse.json();
      if (!authMessageData.success && !authMessageData.message) {
        throw new Error(authMessageData.error || 'Failed to get auth message');
      }
      
      const messageToSign = authMessageData.message || 
                         (authMessageData.data && authMessageData.data.message) || 
                         'Failed to get auth message';
                         
      console.log('📝 Auth message to sign for revocation:', messageToSign);
      
      // Step 2: Sign the message with user's wallet
      const signedMessage = await signMessageAsync({
        message: messageToSign
      });
      console.log('✅ Revocation message signed successfully');
      
      // Step 3: Revoke access
      console.log('📤 Sending revoke request to API...');
      const revokeResponse = await fetch('/api/lighthouse/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hash: fileHash,
          publicKey: address,
          signedMessage,
          revokeAddresses: [addressToRevoke]
        })
      });
      
      if (!revokeResponse.ok) {
        let errorMessage = 'Revocation failed';
        try {
          const errorData = await revokeResponse.json();
          errorMessage = errorData.error || `Revocation failed with status ${revokeResponse.status}`;
        } catch (e) {
          errorMessage = `Revocation failed with status ${revokeResponse.status}`;
        }
        throw new Error(errorMessage);
      }
      
      const result = await revokeResponse.json();
      console.log('✅ Access revoked successfully:', result);
      
      setRevokeSuccess(true);
      setRevokeResult(result);
      
      if (onRevokeComplete) {
        onRevokeComplete(result);
      }
      
    } catch (error) {
      console.error('❌ Revocation failed:', error);
      setRevokeError(`Revocation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Revoke File Access</h3>
      
      <form onSubmit={handleRevoke}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File CID
          </label>
          <input
            type="text"
            value={fileHash}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address to Revoke Access
          </label>
          <input
            type="text"
            value={addressToRevoke}
            onChange={(e) => setAddressToRevoke(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter the Ethereum address you previously shared this file with
          </p>
        </div>
        
        <button
          type="submit"
          disabled={isRevoking || !isConnected || !fileHash}
          className={`w-full py-2 px-4 rounded-md font-medium ${
            isRevoking || !isConnected || !fileHash
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {isRevoking ? 'Revoking Access...' : 'Revoke Access'}
        </button>
      </form>
      
      {revokeError && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {revokeError}
        </div>
      )}
      
      {revokeSuccess && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          <p className="font-semibold">Access revoked successfully!</p>
          <p className="text-sm">
            Access has been revoked for {addressToRevoke}
          </p>
        </div>
      )}
    </div>
  );
}
