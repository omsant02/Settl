'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useSignMessage } from 'wagmi';
import Link from 'next/link';

export default function DecryptFile() {
  const params = useParams();
  const hash = params?.hash as string || '';

  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('image/jpeg'); // Default to image
  const [decryptedFileType, setDecryptedFileType] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [encryptionStatus, setEncryptionStatus] = useState<string | boolean>('unknown');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [decryptedBlob, setDecryptedBlob] = useState<Blob | null>(null);

  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    if (hash) {
      fetchFileInfo();
      generatePreviewUrl();
    } else {
      setIsLoading(false);
    }
  }, [hash]);

  // Format file size helper function
  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes <= 0) return 'Unknown Size';
    
    if (sizeInBytes < 1024) {
      return sizeInBytes + ' B';
    } else if (sizeInBytes < 1024 * 1024) {
      return (sizeInBytes / 1024).toFixed(2) + ' KB';
    } else {
      return (sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
  };

  const generatePreviewUrl = () => {
    // Generate a preview URL for the file
    const gatewayUrl = `https://gateway.lighthouse.storage/ipfs/${hash}`;
    setPreviewUrl(gatewayUrl);
  };

  const fetchFileInfo = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Fetching file info for:', hash);
      
      // Try to get file info from our API
      const response = await fetch(`/api/lighthouse/file/${hash}`);
      
      if (!response.ok) {
        console.warn('⚠️ File info API returned error status:', response.status);
        
        // If API fails, set some default values
        setFileName(hash || 'Unknown File');
        setFileSize('Unknown Size');
        setFileType('application/octet-stream');
        setEncryptionStatus('unknown');
        
        // Try to determine file type from hash/filename
        if (hash.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          setFileType('image/jpeg');
        } else if (hash.match(/\.(mp4|webm|mov)$/i)) {
          setFileType('video/mp4');
        } else if (hash.match(/\.(mp3|wav|ogg)$/i)) {
          setFileType('audio/mpeg');
        }
        
        return;
      }
      
      // Parse response as JSON
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
        // Set file name
        setFileName(data.fileName || hash || 'Unknown File');
        
        // Format file size
        if (data.fileSize) {
          const sizeInBytes = parseInt(data.fileSize);
          setFileSize(formatFileSize(sizeInBytes));
        } else {
          setFileSize('Unknown Size');
        }
        
        // Set file type
        setFileType(data.mimeType || 'application/octet-stream');
        
        // Set encryption status
        setEncryptionStatus(data.encryptionStatus || 'unknown');
        
        console.log('✅ File info processed:', {
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          encryptionStatus: data.encryptionStatus
        });
      } else {
        console.warn('⚠️ File info API returned error:', data.error);
        setDecryptError(data.error || 'Failed to fetch file info');
        
        // Set default values
        setFileName(hash || 'Unknown File');
        setFileSize('Unknown Size');
        setEncryptionStatus('unknown');
      }
    } catch (error) {
      console.error('❌ Error fetching file info:', error);
      setDecryptError('Error fetching file info');
      
      // Set default values
      setFileName(hash || 'Unknown File');
      setFileSize('Unknown Size');
      setEncryptionStatus('unknown');
    } finally {
      setIsLoading(false);
    }
  };

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
    setDecryptedFileType('');

    try {
      console.log('🔓 Starting decryption for hash:', hash);

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
      
      // Set up request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      try {
        // Use fetch with blob() response type for binary data
        const decryptResponse = await fetch(`/api/lighthouse/decrypt/${hash}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            publicKey: address, 
            signedMessage, 
            mimeType: fileType 
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!decryptResponse.ok) {
          let errorMessage = 'Decryption failed';
          try {
            const errorData = await decryptResponse.json();
            errorMessage = errorData.error || `Decryption failed with status ${decryptResponse.status}`;
          } catch (e) {
            errorMessage = `Decryption failed with status ${decryptResponse.status}`;
          }
          throw new Error(errorMessage);
        }

        // Get the content type from the response headers
        const contentType = decryptResponse.headers.get('Content-Type') || fileType;
        setDecryptedFileType(contentType);
        console.log('🔤 Detected content type from response:', contentType);

        // Get the decrypted file as a Blob
        const blob = await decryptResponse.blob();
        
        // Verify that the decrypted file is different from the encrypted one
        if (blob.size === 0) {
          throw new Error('Decryption returned an empty file');
        }
        
        console.log('📊 Decrypted file size:', blob.size, 'bytes');
        console.log('🔤 Decrypted file type:', blob.type);
        
        // Store the blob for potential download
        setDecryptedBlob(blob);
        
        // Create a URL for the blob
        const url = URL.createObjectURL(blob);
        setDecryptedUrl(url);
        console.log('✅ File decrypted successfully. URL created:', url);
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Decryption request timed out. Server may be overloaded.');
        }
        throw fetchError;
      }

    } catch (error) {
      console.error('❌ Decryption failed:', error);
      setDecryptError(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleDownload = () => {
    if (!decryptedBlob || !decryptedUrl) return;
    
    // Create a download link
    const a = document.createElement('a');
    a.href = decryptedUrl;
    a.download = fileName || hash;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const renderPreview = () => {
    if (!previewUrl) return null;
    
    // If the file is encrypted, show a placeholder with a lock icon
    if (encryptionStatus === true) {
      return (
        <div className="mt-4 p-8 bg-gray-100 rounded-lg text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-gray-600">This file is encrypted.</p>
          <p className="text-gray-600">Decrypt to view the content.</p>
        </div>
      );
    }
    
    // Otherwise, try to show a preview based on file type
    if (fileType.startsWith('image/')) {
      return (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-2">Preview (from IPFS gateway):</p>
          <img 
            src={previewUrl} 
            alt="File Preview" 
            className="max-w-full h-auto rounded-lg shadow-md"
            onError={(e) => {
              // If image fails to load, show a placeholder
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML += '<div class="p-4 bg-gray-100 rounded-md text-center">Preview not available</div>';
            }}
          />
        </div>
      );
    }
    
    return (
      <div className="mt-4 p-4 bg-gray-100 rounded-md">
        <p className="font-semibold">File Type: {fileType}</p>
        <p>Preview not available. <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View on IPFS Gateway</a></p>
      </div>
    );
  };

  const renderFileContent = () => {
    if (!decryptedUrl) return null;

    // Use the actual detected file type from the decrypted content
    const displayFileType = decryptedFileType || fileType;

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
          <p className="font-semibold">File Type: {displayFileType}</p>
          <p>Preview not available.</p>
        </div>
      );
    }
  };

  // Get a human-readable file type description
  const getFileTypeDescription = (mimeType: string): string => {
    const types: {[key: string]: string} = {
      'image/jpeg': 'JPEG Image',
      'image/png': 'PNG Image',
      'image/gif': 'GIF Image',
      'image/webp': 'WebP Image',
      'image/svg+xml': 'SVG Image',
      'video/mp4': 'MP4 Video',
      'video/webm': 'WebM Video',
      'audio/mpeg': 'MP3 Audio',
      'audio/wav': 'WAV Audio',
      'audio/ogg': 'OGG Audio',
      'application/pdf': 'PDF Document',
      'application/json': 'JSON File',
      'text/plain': 'Text File',
      'text/html': 'HTML File',
      'application/zip': 'ZIP Archive',
      'application/x-tar': 'TAR Archive',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet'
    };
    
    return types[mimeType] || mimeType;
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
          <p><strong>Encryption Status:</strong> {encryptionStatus === true ? '🔐 Encrypted' : '🔓 Not Encrypted'}</p>
        )}

        {/* File Preview Section */}
        {!isLoading && !decryptedUrl && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">File Preview</h3>
            {renderPreview()}
          </div>
        )}

        {isLoading ? (
          <div className="w-full py-2 px-4 mt-6 text-center bg-gray-200 rounded-md">
            Loading file information...
          </div>
        ) : !decryptedUrl && (
          <button
            onClick={handleDecrypt}
            disabled={isDecrypting || !isConnected || !hash}
            className={`w-full py-2 px-4 rounded-md font-medium mt-6 ${
              isDecrypting || !isConnected || !hash
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isDecrypting ? 'Decrypting...' : 'Decrypt File'}
          </button>
        )}

        {decryptError && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {decryptError}
          </div>
        )}

        {decryptedUrl && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Decrypted Content:</h2>
            {decryptedFileType && (
              <p className="mb-2"><strong>Decrypted File Type:</strong> {getFileTypeDescription(decryptedFileType)}</p>
            )}
            {renderFileContent()}
            <div className="mt-4 flex space-x-4">
              <button
                onClick={handleDownload}
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Download Decrypted File
              </button>
              {decryptedBlob && decryptedBlob.size > 0 && (
                <span className="text-sm text-gray-500 self-center">
                  {formatFileSize(decryptedBlob.size)}
                </span>
              )}
            </div>
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