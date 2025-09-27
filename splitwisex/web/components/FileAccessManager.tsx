'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import ShareFileForm from './ShareFileForm';
import RevokeAccessForm from './RevokeAccessForm';

interface FileAccessManagerProps {
  fileHash: string;
  isEncrypted: boolean;
  isOwner?: boolean;
}

export default function FileAccessManager({ fileHash, isEncrypted, isOwner = true }: FileAccessManagerProps) {
  const [activeTab, setActiveTab] = useState<'share' | 'revoke'>('share');
  const { isConnected } = useAccount();

  // If the file is not encrypted, user is not connected, or user is not the owner, don't show access management
  if (!isEncrypted || !isConnected || !isOwner) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('share')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'share'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Share File Access
          </button>
          <button
            onClick={() => setActiveTab('revoke')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'revoke'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Revoke Access
          </button>
        </nav>
      </div>
      
      {activeTab === 'share' ? (
        <ShareFileForm fileHash={fileHash} />
      ) : (
        <RevokeAccessForm fileHash={fileHash} />
      )}
      
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded text-sm">
        <p className="font-semibold mb-1">How File Access Works</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li><strong>Share Access:</strong> Grant permission to other wallet addresses to decrypt this file.</li>
          <li><strong>Revoke Access:</strong> Remove previously granted access permissions from any wallet address.</li>
          <li>Only the file owner can manage these access permissions.</li>
          <li>Recipients will need to connect their wallet and sign a message to decrypt the file.</li>
          <li>Sharing is handled by Lighthouse's decentralized access control protocol.</li>
        </ul>
      </div>
    </div>
  );
}
