'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useSignMessage } from 'wagmi';
import Link from 'next/link';
import { FaLock, FaFileAlt } from 'react-icons/fa'; // Import icons
import FileAccessManager from '../../../components/FileAccessManager';

// Helper function to format file size
const formatFileSize = (bytes: number | string): string => {
  const numBytes = typeof bytes === 'string' ? parseInt(bytes) : bytes;
  if (isNaN(numBytes) || numBytes < 0) {
    return 'Unknown Size';
  }
  if (numBytes < 1024) {
    return `${numBytes} B`;
  } else if (numBytes < 1024 * 1024) {
    return `${(numBytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(numBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
};

// Helper function to get human-readable file type description
const getFileTypeDescription = (mimeType: string): string => {
  if (!mimeType) return 'Unknown File Type';
  if (mimeType.startsWith('image/')) return 'Image File';
  if (mimeType.startsWith('video/')) return 'Video File';
  if (mimeType.startsWith('audio/')) return 'Audio File';
  if (mimeType === 'application/pdf') return 'PDF Document';
  if (mimeType === 'text/plain') return 'Text Document';
  if (mimeType === 'application/json') return 'JSON File';
  return mimeType; // Fallback to raw MIME type
};

export default function DecryptFile() {
  const params = useParams();
  const hash = params?.hash as string || '';

  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [decryptedBlob, setDecryptedBlob] = useState<Blob | null>(null);
  const [decryptedFileType, setDecryptedFileType] = useState<string>('application/octet-stream');
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('application/octet-stream');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [encryptionStatus, setEncryptionStatus] = useState<string | boolean>('unknown');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showAccessManager, setShowAccessManager] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [ownerCheckComplete, setOwnerCheckComplete] = useState<boolean>(false);

  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const fetchFileInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Fetching file info for:', hash);

      const response = await fetch(`/api/lighthouse/file/${hash}`);

      if (!response.ok) {
        console.warn('⚠️ File info API returned error status:', response.status);
        setDecryptError(`Failed to fetch file info: Server responded with ${response.status}`);
        setFileName(hash || 'Unknown File');
        setFileSize('Unknown Size');
        setFileType('application/octet-stream');
        setEncryptionStatus('unknown');
        return;
      }

      let data;
      try {
        data = await response.json();
        console.log('✅ File info response:', data);
      } catch (parseError) {
        console.error('❌ Error parsing file info response:', parseError);
        setDecryptError('Error parsing file info response');
        return;
      }

      if (data.success) {
        setFileName(data.fileName || hash || 'Unknown File');
        setFileSize(formatFileSize(data.fileSize));
        setFileType(data.mimeType || 'application/octet-stream');
        setEncryptionStatus(data.encryptionStatus || 'unknown');

        console.log('✅ File info processed:', {
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          encryptionStatus: data.encryptionStatus
        });

        // Set preview URL if not encrypted
        if (data.encryptionStatus === false || data.encryptionStatus === 'false') {
          const gatewayUrl = `https://gateway.lighthouse.storage/ipfs/${hash}`;
          setPreviewUrl(gatewayUrl);
          console.log('🖼️ Setting preview URL (unencrypted):', gatewayUrl);
        } else {
          setPreviewUrl(null); // No direct preview for encrypted files
        }

      } else {
        console.warn('⚠️ File info API returned error:', data.error);
        setDecryptError(data.error || 'Failed to fetch file info');
        setFileName(hash || 'Unknown File');
        setFileSize('Unknown Size');
        setEncryptionStatus('unknown');
      }
    } catch (error) {
      console.error('❌ Error fetching file info:', error);
      setDecryptError(`Error fetching file info: ${error instanceof Error ? error.message : String(error)}`);
      setFileName(hash || 'Unknown File');
      setFileSize('Unknown Size');
      setEncryptionStatus('unknown');
    } finally {
      setIsLoading(false);
    }
  }, [hash]);

  useEffect(() => {
    if (hash) {
      fetchFileInfo();
    } else {
      setIsLoading(false);
    }
  }, [hash, fetchFileInfo]);
  
  // Check if the current wallet is the owner of the file
  useEffect(() => {
    const checkOwnership = async () => {
      if (!hash || !isConnected || !address || encryptionStatus !== true) {
        setOwnerCheckComplete(true);
        return;
      }
      
      try {
        console.log('🔍 Checking if current wallet is file owner:', address);
        
        const response = await fetch('/api/lighthouse/check-owner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hash: hash,
            publicKey: address
          })
        });
        
        if (!response.ok) {
          console.warn('⚠️ Owner check failed:', response.status);
          setIsOwner(false);
          return;
        }
        
        const data = await response.json();
        console.log('✅ Owner check result:', data);
        
        // Set owner state based on response
        setIsOwner(data.isOwner || false);
      } catch (error) {
        console.error('❌ Error checking file ownership:', error);
        setIsOwner(false);
      } finally {
        setOwnerCheckComplete(true);
      }
    };
    
    if (encryptionStatus === true) {
      checkOwnership();
    } else {
      setOwnerCheckComplete(true);
    }
  }, [hash, address, isConnected, encryptionStatus]);

  const handleDecrypt = async () => {
    if (!isConnected || !address) {
      setDecryptError('Please connect your wallet to decrypt the file.');
      return;
    }
    if (!hash) {
      setDecryptError('File hash is missing.');
      return;
    }

    setIsDecrypting(true);
    setDecryptError(null);
    setDecryptedUrl(null);
    setDecryptedBlob(null);
    setDecryptedFileType('application/octet-stream');
    setDebugInfo(null);

    try {
      console.log('🔓 Starting decryption for hash:', hash);
      console.log('👤 Using address:', address);

      // Step 1: Get authentication message
      console.log('📋 Getting auth message for decryption...');
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

      console.log('📝 Auth message to sign for decryption:', messageToSign);

      // Step 2: Sign the message with user's wallet
      const signedMessage = await signMessageAsync({
        message: messageToSign
      });
      console.log('✅ Decryption message signed successfully');

      // Step 3: Request decryption from our backend API
      console.log('📤 Sending decryption request to /api/lighthouse/decrypt...');
      
      // Add debug info to the request
      const debugData = {
        address,
        hash,
        fileType,
        encryptionStatus,
        timestamp: new Date().toISOString()
      };
      
      setDebugInfo(JSON.stringify(debugData, null, 2));
      
      const decryptResponse = await fetch(`/api/lighthouse/decrypt/${hash}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: address,
          signedMessage,
          mimeType: fileType, // Pass original file type as a hint
          debug: debugData
        })
      });

      if (!decryptResponse.ok) {
        let errorMessage = 'Decryption failed';
        try {
          const errorData = await decryptResponse.json();
          errorMessage = errorData.error || `Decryption failed with status ${decryptResponse.status}`;
        } catch (e) {
          errorMessage = `Decryption failed with status ${decryptResponse.status} (could not parse error response)`;
        }
        throw new Error(errorMessage);
      }

      // Get the decrypted file as a Blob
      const decryptedBlobData = await decryptResponse.blob();
      const actualContentType = decryptResponse.headers.get('Content-Type') || decryptedBlobData.type;
      const decryptedFileSize = decryptedBlobData.size;

      if (decryptedBlobData.size === 0) {
        throw new Error('Decryption resulted in an empty file. Access denied or file corrupted.');
      }

      const url = URL.createObjectURL(decryptedBlobData);
      setDecryptedUrl(url);
      setDecryptedBlob(decryptedBlobData);
      setDecryptedFileType(actualContentType);
      console.log(`✅ File decrypted successfully. URL created. Size: ${formatFileSize(decryptedFileSize)}, Type: ${actualContentType}`);

    } catch (error) {
      console.error('❌ Decryption failed:', error);
      setDecryptError(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleDownloadDecrypted = () => {
    if (decryptedBlob && decryptedUrl) {
      const link = document.createElement('a');
      link.href = decryptedUrl;
      link.download = fileName || hash; // Use original filename or hash
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('⬇️ Decrypted file download initiated.');
    } else {
      setDecryptError('No decrypted file available for download.');
    }
  };

  const toggleAccessManager = () => {
    setShowAccessManager(!showAccessManager);
  };

  const renderFilePreview = () => {
    if (isLoading) {
      return <div className="text-center text-gray-500">Loading preview...</div>;
    }

    if (encryptionStatus === true || encryptionStatus === 'true') {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded-lg text-gray-700">
          <FaLock className="text-5xl mb-4 text-blue-500" />
          <p className="text-lg font-semibold">This file is encrypted.</p>
          <p className="text-sm text-center">A preview is not available until decryption. Only authorized wallets can decrypt.</p>
        </div>
      );
    }

    if (previewError) {
      return (
        <div className="text-center text-red-500 p-4 bg-red-100 rounded-lg">
          Error loading preview: {previewError}
        </div>
      );
    }

    if (previewUrl) {
      if (fileType.startsWith('image/')) {
        return (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg shadow-inner">
            <h3 className="text-md font-semibold mb-2 text-gray-700">Preview (from IPFS Gateway):</h3>
            <img
              src={previewUrl}
              alt="File Preview"
              className="max-w-full h-auto rounded-lg shadow-md border border-gray-300"
              onError={() => setPreviewError('Failed to load image preview.')}
            />
          </div>
        );
      } else if (fileType.startsWith('video/')) {
        return (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg shadow-inner">
            <h3 className="text-md font-semibold mb-2 text-gray-700">Preview (from IPFS Gateway):</h3>
            <video
              src={previewUrl}
              controls
              className="max-w-full h-auto rounded-lg shadow-md border border-gray-300"
              onError={() => setPreviewError('Failed to load video preview.')}
            />
          </div>
        );
      } else if (fileType.startsWith('audio/')) {
        return (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg shadow-inner">
            <h3 className="text-md font-semibold mb-2 text-gray-700">Preview (from IPFS Gateway):</h3>
            <audio
              src={previewUrl}
              controls
              className="max-w-full"
              onError={() => setPreviewError('Failed to load audio preview.')}
            />
          </div>
        );
      } else {
        return (
          <div className="mt-4 p-4 bg-gray-100 rounded-md shadow-inner">
            <h3 className="text-md font-semibold mb-2 text-gray-700">Preview (from IPFS Gateway):</h3>
            <p className="font-semibold">File Type: {getFileTypeDescription(fileType)}</p>
            <p>Preview not available. <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View on IPFS Gateway</a></p>
          </div>
        );
      }
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded-lg text-gray-700">
        <FaFileAlt className="text-5xl mb-4 text-gray-400" />
        <p className="text-lg font-semibold">No preview available.</p>
        <p className="text-sm text-center">File might be encrypted or an unsupported type for direct preview.</p>
      </div>
    );
  };

  const renderDecryptedContent = () => {
    if (!decryptedUrl) return null;

    const displayFileType = decryptedFileType || fileType; // Use decrypted type if available, else original
    const displayFileName = fileName || hash;

    if (displayFileType.startsWith('image/')) {
      return (
        <div className="mt-4">
          <img
            src={decryptedUrl}
            alt="Decrypted File"
            className="max-w-full h-auto rounded-lg shadow-md"
          />
        </div>
      );
    } else if (displayFileType.startsWith('video/')) {
      return (
        <div className="mt-4">
          <video
            src={decryptedUrl}
            controls
            className="max-w-full h-auto rounded-lg shadow-md"
          />
        </div>
      );
    } else if (displayFileType.startsWith('audio/')) {
      return (
        <div className="mt-4">
          <audio
            src={decryptedUrl}
            controls
            className="max-w-full"
          />
        </div>
      );
    } else {
      return (
        <div className="p-4 bg-gray-100 rounded-md mt-4">
          <p className="font-semibold">Decrypted File Type: {getFileTypeDescription(displayFileType)}</p>
          <p>Preview not available. <a href={decryptedUrl} download={displayFileName} className="text-blue-600 hover:underline">Download file</a></p>
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">🔓 Decrypt & View File</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">File Details</h2>
        <p><strong>CID:</strong> {hash}</p>
        <p><strong>File Name:</strong> {isLoading ? 'Loading...' : fileName}</p>
        <p><strong>File Size:</strong> {isLoading ? 'Loading...' : fileSize}</p>
        <p><strong>File Type:</strong> {isLoading ? 'Loading...' : getFileTypeDescription(fileType)}</p>
        {!isLoading && encryptionStatus !== 'unknown' && (
          <p><strong>Encryption Status:</strong> {encryptionStatus === true || encryptionStatus === 'true' ? '🔐 Encrypted' : '🔓 Not Encrypted'}</p>
        )}
        {isConnected && (
          <p><strong>Connected Wallet:</strong> {address}</p>
        )}

        <div className="mt-6 mb-6">
          {renderFilePreview()}
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          {isLoading ? (
            <div className="w-full py-2 px-4 text-center bg-gray-200 rounded-md">
              Loading file information...
            </div>
          ) : !decryptedUrl && (
            <button
              onClick={handleDecrypt}
              disabled={isDecrypting || !isConnected || !hash}
              className={`py-2 px-4 rounded-md font-medium ${
                isDecrypting || !isConnected || !hash
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isDecrypting ? 'Decrypting...' : 'Decrypt File'}
            </button>
          )}

          {isConnected && (encryptionStatus === true || encryptionStatus === 'true') && ownerCheckComplete && isOwner && (
            <button
              onClick={toggleAccessManager}
              className="py-2 px-4 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              {showAccessManager ? 'Hide Access Manager' : 'Manage File Access'}
            </button>
          )}
          
          {/* Debug indicator to show ownership status */}
          {isConnected && (encryptionStatus === true || encryptionStatus === 'true') && ownerCheckComplete && (
            <span className="ml-2 text-xs text-gray-500">
              Ownership Status: {isOwner ? 'Owner' : 'Not Owner'}
            </span>
          )}
        </div>

        {showAccessManager && isConnected && (encryptionStatus === true || encryptionStatus === 'true') && isOwner && (
          <FileAccessManager fileHash={hash} isEncrypted={true} isOwner={isOwner} />
        )}
        
        {isConnected && (encryptionStatus === true || encryptionStatus === 'true') && ownerCheckComplete && !isOwner && (
          <div className="my-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-medium text-blue-800">Shared File Access</p>
            <p className="text-sm text-blue-700 mt-1">
              This encrypted file has been shared with your wallet. You can decrypt and view it using your wallet signature.
            </p>
            <p className="text-xs text-blue-600 mt-2">
              Only the file owner can manage access permissions.
            </p>
          </div>
        )}

        {decryptError && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {decryptError}
          </div>
        )}

        {decryptedUrl && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Decrypted Content:</h2>
            <p><strong>Decrypted File Type:</strong> {getFileTypeDescription(decryptedFileType)}</p>
            {renderDecryptedContent()}
            <div className="mt-4">
              <button
                onClick={handleDownloadDecrypted}
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Download Decrypted File ({formatFileSize(decryptedBlob?.size || 0)})
              </button>
            </div>
          </div>
        )}

        {debugInfo && (
          <div className="mt-6 p-4 bg-gray-100 rounded-md">
            <h3 className="text-md font-semibold mb-2">Debug Information:</h3>
            <pre className="text-xs overflow-auto max-h-40 p-2 bg-gray-200 rounded">
              {debugInfo}
            </pre>
          </div>
        )}

        <div className="mt-8">
          <Link href="/upload-lighthouse-encrypted" className="text-blue-600 hover:underline">
            ← Back to Upload
          </Link>
        </div>
      </div>
    </div>
  );
}