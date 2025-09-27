'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import lighthouse from '@lighthouse-web3/sdk';

interface UploadResult {
  success: boolean;
  hash?: string;
  name?: string;
  size?: number;
  encrypted?: boolean;
  publicKey?: string;
  gatewayUrl?: string;
  error?: string;
  note?: string;
}

export default function EncryptedFileUpload() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [enableEncryption, setEnableEncryption] = useState(true);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Fetch API key when component mounts
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/lighthouse/get-api-key');
        const data = await response.json();
        if (data.success && data.apiKey) {
          setApiKey(data.apiKey);
        } else {
          console.error('Failed to get API key:', data.error);
        }
      } catch (error) {
        console.error('Error fetching API key:', error);
      }
    };

    fetchApiKey();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus('');
      setUploadResult(null);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('❌ Please select a file');
      return;
    }

    if (enableEncryption && (!address || !isConnected)) {
      setUploadStatus('❌ Please connect your wallet for encrypted uploads');
      return;
    }

    if (!apiKey) {
      setUploadStatus('❌ API key not available. Please try again.');
      return;
    }

    setIsUploading(true);

    try {
      if (enableEncryption) {
        await handleEncryptedUpload();
      } else {
        await handleRegularUpload();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      setUploadStatus(`❌ ${errorMsg}`);
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEncryptedUpload = async () => {
    if (!selectedFile || !address || !isConnected || !apiKey) {
      return;
    }

    try {
      setUploadStatus('Getting authentication message...');

      // Step 1: Get auth message for signing (directly from lighthouse SDK)
      const authMessage = await lighthouse.getAuthMessage(address);
      
      if (!authMessage.data?.message) {
        throw new Error('Failed to get authentication message');
      }

      setUploadStatus('Please sign the message in your wallet...');

      // Step 2: Sign the auth message
      const signedMessage = await signMessageAsync({ 
        message: authMessage.data.message 
      });

      setUploadStatus('Encrypting and uploading file directly from browser...');

      // Step 3: Browser-side encryption and upload
      const uploadResponse = await lighthouse.uploadEncrypted(
        selectedFile,
        apiKey,
        address,
        signedMessage
      );

      console.log('Browser-side encryption response:', uploadResponse);

      // Handle response based on structure
      if (uploadResponse.data) {
        // Convert response to our UploadResult format
        const fileData = Array.isArray(uploadResponse.data) ? uploadResponse.data[0] : uploadResponse.data;
        // Handle different possible property names for the hash/CID
        const hash = fileData.Hash || 
                    (fileData as any).hash || 
                    (fileData as any).cid;

        if (hash) {
          const result: UploadResult = {
            success: true,
            hash,
            name: selectedFile.name,
            size: selectedFile.size,
            encrypted: true,
            publicKey: address,
            note: 'File encrypted and uploaded directly from browser'
          };

          setUploadResult(result);
          setUploadStatus('✅ File encrypted and uploaded successfully!');
        } else {
          throw new Error('No hash returned from upload');
        }
      } else {
        throw new Error('Invalid response from Lighthouse SDK');
      }

    } catch (error) {
      console.error('Browser-side encryption failed:', error);
      
      // Try server-side fallback if browser-side fails
      setUploadStatus('Browser encryption failed, trying server-side encryption...');
      await fallbackToServerSideUpload(true);
    }
  };

  const handleRegularUpload = async () => {
    if (!selectedFile || !apiKey) {
      return;
    }

    try {
      setUploadStatus('Uploading file directly from browser...');
      
      // Direct browser-side upload without encryption
      const uploadResponse = await lighthouse.upload(
        selectedFile, 
        apiKey
      );

      console.log('Browser-side upload response:', uploadResponse);

      if (uploadResponse.data?.Hash) {
        const result: UploadResult = {
          success: true,
          hash: uploadResponse.data.Hash,
          name: selectedFile.name,
          size: selectedFile.size,
          encrypted: false,
          note: 'File uploaded directly from browser'
        };

        setUploadResult(result);
        setUploadStatus('✅ File uploaded successfully!');
      } else {
        throw new Error('No hash returned from upload');
      }
    } catch (error) {
      console.error('Browser-side upload failed:', error);
      
      // Fallback to server-side upload
      setUploadStatus('Browser upload failed, trying server-side upload...');
      await fallbackToServerSideUpload(false);
    }
  };

  const fallbackToServerSideUpload = async (encrypted: boolean) => {
    if (!selectedFile) return;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      if (encrypted && address && isConnected) {
        // Get auth message for signing
        const authResponse = await fetch('/api/lighthouse/auth-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicKey: address })
        });

        if (!authResponse.ok) {
          throw new Error('Failed to get authentication message');
        }

        const { message } = await authResponse.json();
        
        // Sign the auth message
        const signedMessage = await signMessageAsync({ message });
        
        // Add encryption parameters
        formData.append('publicKey', address);
        formData.append('signedMessage', signedMessage);
        formData.append('encrypted', 'true');
      } else {
        formData.append('encrypted', 'false');
      }

      // Upload using the server as a proxy
      setUploadStatus('Uploading via server...');
      const uploadResponse = await fetch('/api/lighthouse/upload', {
        method: 'POST',
        body: formData
      });

      const result: UploadResult = await uploadResponse.json();

      if (result.success) {
        setUploadStatus(
          encrypted ? '✅ File encrypted and uploaded via server!' : '✅ File uploaded via server!'
        );
        setUploadResult(result);
      } else {
        throw new Error(result.error || 'Server-side upload failed');
      }
    } catch (error) {
      throw new Error(`Server fallback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setUploadStatus('📋 Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
      <h3 className="text-xl font-semibold mb-4">
        {enableEncryption ? '🔐 Encrypted File Upload' : '📁 File Upload'}
      </h3>
      <p className="text-gray-600 text-sm mb-6">
        {enableEncryption
          ? 'Files are encrypted in your browser using BLS cryptography before upload to Filecoin'
          : 'Files are uploaded directly to Filecoin via Lighthouse'
        }
      </p>

      {/* Encryption Toggle */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={enableEncryption}
            onChange={(e) => setEnableEncryption(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={isUploading}
          />
          <span className="text-sm font-medium text-gray-700">
            🔐 Enable Encryption (BLS cryptography)
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-7">
          {enableEncryption
            ? 'File will be encrypted before upload. Requires wallet signature.'
            : 'File will be uploaded without encryption. No wallet signature needed.'
          }
        </p>
      </div>

      {/* File Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {enableEncryption ? 'Select File to Encrypt:' : 'Select File to Upload:'}
        </label>
        <input
          type="file"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          disabled={isUploading}
        />
      </div>

      {/* File Details */}
      {selectedFile && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <h4 className="font-semibold text-sm text-gray-700 mb-2">File Details:</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Name:</strong> {selectedFile.name}</p>
            <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(1)} KB</p>
            <p><strong>Type:</strong> {selectedFile.type || 'Unknown'}</p>
          </div>
        </div>
      )}

      {/* Upload Details */}
      <div className="mb-4 p-3 bg-blue-50 rounded-md">
        <h4 className="font-semibold text-sm text-blue-800 mb-2">Upload Details:</h4>
        <div className="text-sm text-blue-700 space-y-1">
          {enableEncryption ? (
            <>
              <p><strong>Owner:</strong> {isConnected ? address : 'Not connected'}</p>
              <p><strong>Encryption:</strong> BLS with 5-node key splitting</p>
              <p><strong>Storage:</strong> Filecoin via Lighthouse</p>
              <p><strong>Method:</strong> Browser-side encryption (with server fallback)</p>
            </>
          ) : (
            <>
              <p><strong>Encryption:</strong> None (public file)</p>
              <p><strong>Storage:</strong> Filecoin via Lighthouse</p>
              <p><strong>Access:</strong> Anyone with CID can view</p>
              <p><strong>Method:</strong> Browser-side upload (with server fallback)</p>
            </>
          )}
        </div>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleFileUpload}
        disabled={isUploading || !selectedFile || (enableEncryption && !isConnected) || !apiKey}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
      >
        {isUploading
          ? (enableEncryption ? 'Uploading & Encrypting...' : 'Uploading...')
          : (enableEncryption ? '🔐 Upload with Encryption' : '📁 Upload File')
        }
      </button>

      {/* Status */}
      {uploadStatus && (
        <div className="mt-4 p-3 rounded-md bg-gray-50">
          <p className="text-sm text-gray-700">{uploadStatus}</p>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && uploadResult.success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="font-semibold text-green-800 mb-3">Upload Successful! 🎉</h4>

          <div className="space-y-3 text-sm">
            {/* CID */}
            <div className="bg-white p-3 rounded border">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-green-800">File CID:</p>
                  <p className="font-mono text-xs text-gray-600 break-all">{uploadResult.hash}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(uploadResult.hash || '')}
                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                >
                  📋 Copy
                </button>
              </div>
            </div>

            {/* File Info */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><strong>Name:</strong> {uploadResult.name}</div>
              <div><strong>Size:</strong> {uploadResult.size} bytes</div>
              <div><strong>Encrypted:</strong> {uploadResult.encrypted ? 'Yes ✅' : 'No'}</div>
              <div><strong>Owner:</strong> {uploadResult.publicKey?.slice(0, 10)}...</div>
            </div>

            {/* Decrypt URL */}
            {uploadResult.encrypted && uploadResult.hash && (
              <div className="bg-blue-50 p-3 rounded border">
                <p className="font-semibold text-blue-800 mb-1">Decrypt URL:</p>
                <div className="flex justify-between items-center">
                  <p className="font-mono text-xs text-blue-600 break-all">
                    https://decrypt.mesh3.network/evm/{uploadResult.hash}
                  </p>
                  <button
                    onClick={() => copyToClipboard(`https://decrypt.mesh3.network/evm/${uploadResult.hash}`)}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 ml-2"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            )}

            {uploadResult.note && (
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <p className="text-yellow-800 text-xs">{uploadResult.note}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 space-y-2">
            <button
              onClick={() => setSelectedFile(null)}
              className="w-full text-sm bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
            >
              🗂️ Upload Another File
            </button>
          </div>
        </div>
      )}

      {/* Connection Warning */}
      {enableEncryption && !isConnected && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4 text-center">
          <p className="text-yellow-800 font-semibold">
            ⚠️ Please connect your wallet to upload encrypted files
          </p>
        </div>
      )}

      {/* Security Info */}
      <div className="mt-6 text-xs text-gray-500">
        <p className="font-semibold mb-2">
          {enableEncryption ? '🔒 Security Features:' : '📋 Upload Features:'}
        </p>
        <ul className="list-disc list-inside space-y-1">
          {enableEncryption ? (
            <>
              <li>Files are encrypted in your browser before upload</li>
              <li>Encryption key is split into 5 parts using BLS cryptography</li>
              <li>Key parts are stored on separate Lighthouse nodes</li>
              <li>Only you (the file owner) can decrypt or share access</li>
              <li>Files are stored permanently on Filecoin network</li>
            </>
          ) : (
            <>
              <li>Files are uploaded directly to Filecoin network</li>
              <li>No encryption - files are publicly accessible</li>
              <li>Anyone with the CID can view the file</li>
              <li>Faster upload process (no encryption overhead)</li>
              <li>Files are stored permanently on decentralized storage</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}