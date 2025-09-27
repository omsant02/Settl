'use client';

import React, { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

interface ShareFileFormProps {
  cid: string;
  ownerPublicKey?: string; // Optional owner key, defaults to your key
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface ShareResult {
  success: boolean;
  cid?: string;
  sharedWith?: string[];
  message?: string;
  error?: string;
}

export default function ShareFileForm({ cid, ownerPublicKey, onSuccess, onError }: ShareFileFormProps) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // Use your specific owner key as default
  const fileOwnerKey = ownerPublicKey || '0x2274e8baD8bFB86C24109B6173fC7756D15E8C3A';

  // Check if current user is the file owner
  const isCurrentUserOwner = address?.toLowerCase() === fileOwnerKey.toLowerCase();

  const [shareToAddress, setShareToAddress] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<string>('');

  const handleShare = async () => {
    if (!address) {
      setShareStatus('Please connect your wallet');
      onError?.('Wallet not connected');
      return;
    }

    if (!isCurrentUserOwner) {
      setShareStatus('❌ Only the file owner can share this file');
      onError?.('Access denied - not file owner');
      return;
    }

    if (!shareToAddress) {
      setShareStatus('Please enter a recipient address');
      onError?.('Recipient address required');
      return;
    }

    if (!shareToAddress.startsWith('0x') || shareToAddress.length !== 42) {
      setShareStatus('Please enter a valid Ethereum address');
      onError?.('Invalid address format');
      return;
    }

    if (shareToAddress.toLowerCase() === address.toLowerCase()) {
      setShareStatus('❌ You cannot share a file with yourself');
      onError?.('Cannot share with yourself');
      return;
    }

    setIsSharing(true);
    setShareStatus('Getting authentication message...');

    try {
      // Get auth message for the file owner
      const authResponse = await fetch('/api/lighthouse/auth-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: address })
      });

      if (!authResponse.ok) {
        throw new Error('Failed to get authentication message');
      }

      const { message } = await authResponse.json();
      setShareStatus('Please sign the message in your wallet...');

      // Sign the auth message as the file owner
      const signedMessage = await signMessageAsync({ message });
      setShareStatus('Sharing file...');

      // Share the file
      const shareResponse = await fetch('/api/lighthouse/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cid,
          ownerPublicKey: address, // Current user is the owner
          signedMessage,
          shareToPublicKeys: [shareToAddress] // Sharing to the specified address
        })
      });

      const shareResult: ShareResult = await shareResponse.json();

      if (shareResult.success) {
        setShareStatus(`✅ File shared successfully with ${shareToAddress}`);
        setShareToAddress('');
        onSuccess?.();
      } else {
        const errorMsg = shareResult.error || 'Failed to share file';
        setShareStatus(`❌ ${errorMsg}`);
        onError?.(errorMsg);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to share file';
      setShareStatus(`❌ ${errorMsg}`);
      onError?.(errorMsg);
      console.error('Share file error:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Share Encrypted File</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          File CID:
        </label>
        <input
          type="text"
          value={cid}
          readOnly
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          File Owner:
        </label>
        <input
          type="text"
          value={fileOwnerKey}
          readOnly
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-xs"
        />
        {isCurrentUserOwner ? (
          <p className="text-green-600 text-sm mt-1">✅ You are the file owner</p>
        ) : (
          <p className="text-red-600 text-sm mt-1">❌ You are not the file owner</p>
        )}
      </div>

      {isCurrentUserOwner && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Share with (Ethereum Address):
          </label>
          <input
            type="text"
            value={shareToAddress}
            onChange={(e) => setShareToAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSharing}
          />
        </div>
      )}

      {isCurrentUserOwner ? (
        <button
          onClick={handleShare}
          disabled={isSharing || !shareToAddress || !address}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSharing ? 'Sharing...' : 'Share File'}
        </button>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ Only the file owner can share this encrypted file.
            Connect with the owner's wallet to share this file.
          </p>
        </div>
      )}

      {shareStatus && (
        <div className="mt-4 p-3 rounded-md bg-gray-50">
          <p className="text-sm text-gray-700">{shareStatus}</p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>💡 Tips:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Only the file owner can share encrypted files</li>
          <li>The recipient will need to decrypt the file using their wallet</li>
          <li>Make sure the recipient address is correct - sharing cannot be undone</li>
        </ul>
      </div>
    </div>
  );
}