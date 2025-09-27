'use client';

import React, { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

interface FileRecord {
  cid: string;
  name: string;
  size: number;
  uploadedAt: string;
  sharedWith: string[];
  owner: string;
}

interface ShareResult {
  success: boolean;
  message?: string;
  error?: string;
}

interface LighthouseFileManagerProps {
  onFileAdded?: (fileData: { cid: string; name: string; size: number; owner: string }) => void;
}

export default function LighthouseFileManager({ onFileAdded }: LighthouseFileManagerProps = {}) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // User's uploaded files (real CIDs from actual uploads)
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const [selectedFile, setSelectedFile] = useState<string>('');
  const [shareToAddress, setShareToAddress] = useState('');
  const [revokeFromAddress, setRevokeFromAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const isOwner = (fileOwner: string) => {
    return address?.toLowerCase() === fileOwner.toLowerCase();
  };

  const addUploadedFile = (fileData: {
    cid: string;
    name: string;
    size: number;
    owner: string;
  }) => {
    const newFile: FileRecord = {
      cid: fileData.cid,
      name: fileData.name,
      size: fileData.size,
      uploadedAt: new Date().toISOString(),
      sharedWith: [],
      owner: fileData.owner
    };

    setFiles(prev => [newFile, ...prev]);
    setStatusMessage(`✅ File "${fileData.name}" added to your file list`);
  };

  const handleShareFile = async (cid: string) => {
    if (!address || !shareToAddress || !isConnected) {
      setStatusMessage('❌ Please connect wallet and enter recipient address');
      return;
    }

    const file = files.find(f => f.cid === cid);
    if (!file || !isOwner(file.owner)) {
      setStatusMessage('❌ Only file owner can share files');
      return;
    }

    if (shareToAddress.toLowerCase() === address.toLowerCase()) {
      setStatusMessage('❌ Cannot share file with yourself');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Getting authentication message...');

    try {
      // Get auth message
      const authResponse = await fetch('/api/lighthouse/auth-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: address })
      });

      if (!authResponse.ok) {
        throw new Error('Failed to get authentication message');
      }

      const { message } = await authResponse.json();
      setStatusMessage('Please sign the message in your wallet...');

      // Sign message
      const signedMessage = await signMessageAsync({ message });
      setStatusMessage('Sharing file...');

      // Share file
      const shareResponse = await fetch('/api/lighthouse/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cid,
          ownerPublicKey: address,
          signedMessage,
          shareToPublicKeys: [shareToAddress]
        })
      });

      const result: ShareResult = await shareResponse.json();

      if (result.success) {
        setStatusMessage(`✅ File shared successfully with ${shareToAddress}`);

        // Update local state
        setFiles(prev => prev.map(f =>
          f.cid === cid
            ? { ...f, sharedWith: [...f.sharedWith, shareToAddress] }
            : f
        ));

        setShareToAddress('');
      } else {
        setStatusMessage(`❌ Share failed: ${result.error}`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Share failed';
      setStatusMessage(`❌ ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeAccess = async (cid: string) => {
    if (!address || !revokeFromAddress || !isConnected) {
      setStatusMessage('❌ Please connect wallet and enter address to revoke');
      return;
    }

    const file = files.find(f => f.cid === cid);
    if (!file || !isOwner(file.owner)) {
      setStatusMessage('❌ Only file owner can revoke access');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Getting authentication message...');

    try {
      // Get auth message
      const authResponse = await fetch('/api/lighthouse/auth-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: address })
      });

      if (!authResponse.ok) {
        throw new Error('Failed to get authentication message');
      }

      const { message } = await authResponse.json();
      setStatusMessage('Please sign the message in your wallet...');

      // Sign message
      const signedMessage = await signMessageAsync({ message });
      setStatusMessage('Revoking access...');

      // Revoke access
      const revokeResponse = await fetch(`/api/lighthouse/revoke/${cid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerPublicKey: address,
          signedMessage,
          revokeFromPublicKeys: [revokeFromAddress]
        })
      });

      const result = await revokeResponse.json();

      if (result.success) {
        setStatusMessage(`✅ Access revoked from ${revokeFromAddress}`);

        // Update local state
        setFiles(prev => prev.map(f =>
          f.cid === cid
            ? { ...f, sharedWith: f.sharedWith.filter(addr => addr.toLowerCase() !== revokeFromAddress.toLowerCase()) }
            : f
        ));

        setRevokeFromAddress('');
      } else {
        setStatusMessage(`❌ Revoke failed: ${result.error}`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Revoke failed';
      setStatusMessage(`❌ ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">
          🗂️ Lighthouse File Manager
        </h1>
        <p className="text-blue-700">
          Manage encrypted files: Share access, revoke permissions, and control who can decrypt your files
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold text-blue-800">Your Wallet:</h3>
            <p className="font-mono text-xs bg-white p-2 rounded border">
              {isConnected ? address : 'Not connected'}
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-blue-800">File Owner:</h3>
            <p className="font-mono text-xs bg-white p-2 rounded border">
              0x2274e8baD8bFB86C24109B6173fC7756D15E8C3A
            </p>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Encrypted Files ({files.length})</h2>
          {isLoadingFiles && <span className="text-gray-500 text-sm">Loading files...</span>}
        </div>

        {files.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">📁</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Encrypted Files Yet</h3>
            <p className="text-gray-600 mb-4">
              Upload encrypted files using the Encrypted File Upload component to see them here.
            </p>
            <p className="text-sm text-gray-500">
              Once uploaded, you'll be able to share access and manage permissions for your files.
            </p>
          </div>
        ) : (
          files.map((file) => (
          <div key={file.cid} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg">{file.name}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>CID:</strong> <span className="font-mono text-xs">{file.cid}</span></p>
                  <p><strong>Size:</strong> {formatSize(file.size)}</p>
                  <p><strong>Uploaded:</strong> {formatDate(file.uploadedAt)}</p>
                  <p><strong>Owner:</strong> <span className="font-mono text-xs">{file.owner}</span></p>
                </div>
              </div>

              <div className="text-right">
                {isOwner(file.owner) ? (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">
                    ✅ You Own This
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                    👁️ Read Only
                  </span>
                )}
              </div>
            </div>

            {/* Shared With */}
            <div className="mb-4">
              <h4 className="font-semibold text-sm text-gray-700 mb-2">
                Shared With ({file.sharedWith.length}):
              </h4>
              {file.sharedWith.length > 0 ? (
                <div className="space-y-1">
                  {file.sharedWith.map((addr, index) => (
                    <div key={index} className="text-xs font-mono bg-gray-50 p-2 rounded flex justify-between items-center">
                      <span>{addr}</span>
                      {isOwner(file.owner) && (
                        <button
                          onClick={() => {
                            setSelectedFile(file.cid);
                            setRevokeFromAddress(addr);
                          }}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          🚫 Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Not shared with anyone</p>
              )}
            </div>

            {/* Actions */}
            {isOwner(file.owner) && isConnected && (
              <div className="border-t pt-4 space-y-4">
                {/* Share Section */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Share File:</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={selectedFile === file.cid ? shareToAddress : ''}
                      onChange={(e) => {
                        setSelectedFile(file.cid);
                        setShareToAddress(e.target.value);
                      }}
                      placeholder="0x... (recipient address)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      disabled={isProcessing}
                    />
                    <button
                      onClick={() => handleShareFile(file.cid)}
                      disabled={isProcessing || !shareToAddress || selectedFile !== file.cid}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
                    >
                      📤 Share
                    </button>
                  </div>
                </div>

                {/* Revoke Section */}
                {file.sharedWith.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Revoke Access:</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={selectedFile === file.cid ? revokeFromAddress : ''}
                        onChange={(e) => {
                          setSelectedFile(file.cid);
                          setRevokeFromAddress(e.target.value);
                        }}
                        placeholder="0x... (address to revoke)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        disabled={isProcessing}
                      />
                      <button
                        onClick={() => handleRevokeAccess(file.cid)}
                        disabled={isProcessing || !revokeFromAddress || selectedFile !== file.cid}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 text-sm"
                      >
                        🚫 Revoke
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isOwner(file.owner) && (
              <div className="border-t pt-4 bg-yellow-50 p-3 rounded">
                <p className="text-yellow-800 text-sm">
                  ⚠️ You don't own this file. Only the owner can manage sharing and access.
                </p>
              </div>
            )}
          </div>
          ))
        )}
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Status:</h3>
          <p className="text-sm">{statusMessage}</p>
        </div>
      )}

      {/* Connection Warning */}
      {!isConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-yellow-800 font-semibold">
            ⚠️ Please connect your wallet to manage file access
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">How File Sharing Works:</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-semibold text-blue-800 mb-2">🔐 For File Owners:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Upload files with encryption</li>
              <li>Share files with any wallet address</li>
              <li>Revoke access at any time</li>
              <li>Control who can decrypt your files</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-green-800 mb-2">👁️ For Recipients:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Receive shared files via your wallet</li>
              <li>Decrypt files shared with you</li>
              <li>Cannot reshare files you don't own</li>
              <li>Access can be revoked by owner</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded">
          <p className="text-blue-800 text-sm">
            💡 <strong>Note:</strong> In this demo, you can only manage files if you're connected
            with the owner's wallet (0x2274e8baD8bFB86C24109B6173fC7756D15E8C3A).
            Other wallets can only view files shared with them.
          </p>
        </div>
      </div>
    </div>
  );
}