'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import FileAccessManager from '../../../components/FileAccessManager';

export default function ViewFile() {
  const params = useParams();
  const hash = params?.hash as string || '';

  const [isLoading, setIsLoading] = useState(true);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [ownerCheckComplete, setOwnerCheckComplete] = useState<boolean>(false);

  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (hash) {
      fetchFileInfo();
    } else {
      setIsLoading(false);
    }
  }, [hash]);
  
  // Check if the current wallet is the owner of the file
  useEffect(() => {
    const checkOwnership = async () => {
      if (!hash || !isConnected || !address || !fileInfo?.encryptionStatus) {
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
    
    if (fileInfo) {
      checkOwnership();
    }
  }, [hash, address, isConnected, fileInfo]);

  const fetchFileInfo = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Fetching file info for:', hash);
      
      // Try to get file info from our API
      const response = await fetch(`/api/lighthouse/file/${hash}`);
      
      if (!response.ok) {
        console.warn('⚠️ File info API returned error status:', response.status);
        setFileError('Failed to fetch file information');
        return;
      }
      
      const data = await response.json();
      console.log('✅ File info response:', data);
      
      if (data.success) {
        setFileInfo(data);
      } else {
        setFileError(data.error || 'Failed to fetch file information');
      }
    } catch (error) {
      console.error('❌ Error fetching file info:', error);
      setFileError('Error fetching file information');
    } finally {
      setIsLoading(false);
    }
  };

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

  const renderFilePreview = () => {
    if (!fileInfo) return null;
    
    const mimeType = fileInfo.mimeType || 'application/octet-stream';
    const isEncrypted = fileInfo.encryptionStatus === true;
    const previewUrl = `https://gateway.lighthouse.storage/ipfs/${hash}`;
    
    if (isEncrypted) {
      return (
        <div className="mt-4 p-8 bg-gray-100 rounded-lg text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-gray-600">This file is encrypted.</p>
          <p className="text-gray-600">
            <Link href={`/decrypt-file/${hash}`} className="text-blue-600 hover:underline">
              Decrypt to view the content
            </Link>
          </p>
        </div>
      );
    }
    
    if (mimeType.startsWith('image/')) {
      return (
        <div className="mt-4">
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
        <p className="font-semibold">File Type: {getFileTypeDescription(mimeType)}</p>
        <p>Preview not available. <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View on IPFS Gateway</a></p>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">File Management</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">2. Manage File Access</h2>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-2">Loading file information...</p>
          </div>
        ) : fileError ? (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {fileError}
          </div>
        ) : fileInfo ? (
          <>
            <div className="space-y-2 mb-6">
              <p><strong>CID:</strong> {hash}</p>
              <p><strong>File Name:</strong> {fileInfo.fileName || hash}</p>
              <p><strong>File Size:</strong> {formatFileSize(fileInfo.fileSize || 0)}</p>
              <p><strong>File Type:</strong> {getFileTypeDescription(fileInfo.mimeType || 'application/octet-stream')}</p>
              
              {fileInfo.encryptionStatus !== undefined && (
                <p>
                  <strong>Encryption Status:</strong>{' '}
                  {fileInfo.encryptionStatus === true ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      🔐 Encrypted
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      🔓 Not Encrypted
                    </span>
                  )}
                </p>
              )}
            </div>
            
            {/* File Access Management Section */}
            {isConnected && (fileInfo.encryptionStatus === true) && ownerCheckComplete && (
              <div className="mb-8 border-t border-gray-200 pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">
                  {isOwner ? 'File Access Management' : 'File Access Information'}
                </h3>
                
                {isOwner ? (
                  <>
                    <FileAccessManager 
                      fileHash={hash} 
                      isEncrypted={fileInfo.encryptionStatus === true} 
                      isOwner={isOwner}
                    />
                    <p className="mt-4 text-sm text-gray-600">
                      As the file owner, you can share this encrypted file with other wallet addresses or revoke previously granted access.
                    </p>
                  </>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="font-medium text-blue-800">Shared File Access</p>
                    <p className="text-sm text-blue-700 mt-1">
                      This encrypted file has been shared with your wallet. You can decrypt and view it using your wallet signature.
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      Only the file owner can manage access permissions.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Preview Section */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">File Preview</h3>
              {renderFilePreview()}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                href={`/decrypt-file/${hash}`}
                className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                3. Decrypt & View File
              </Link>
              
              <a
                href={`https://gateway.lighthouse.storage/ipfs/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                4. View on IPFS Gateway
              </a>
              
              <Link
                href="/upload-lighthouse-encrypted"
                className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Upload Another File
              </Link>
            </div>
          </>
        ) : (
          <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            No file information available
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