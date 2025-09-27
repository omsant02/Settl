'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { FileUploader } from 'react-drag-drop-files';
import Link from 'next/link';

const fileTypes = ["JPG", "PNG", "GIF", "JPEG", "PDF", "MP4", "MP3", "ZIP", "WEBP"];

export default function UploadLighthouseEncrypted() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFileHash, setUploadedFileHash] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const handleFileChange = (fileOrFiles: File | File[]) => {
    // Handle single file or first file from array
    const selectedFile = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
    setFile(selectedFile);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadedFileHash(null);
    setUploadedFileName(null);
    setUploadProgress(0);
  };

  const handleServerSideEncryption = async () => {
    if (!file) {
      setUploadError('Please select a file first');
      return;
    }

    if (!isConnected || !address) {
      setUploadError('Please connect your wallet to encrypt files');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadedFileHash(null);
    setUploadedFileName(null);
    setUploadProgress(0);

    try {
      console.log('🔐 Starting server-side encryption for:', file.name);

      // Step 1: Get authentication message
      console.log('📋 Getting auth message for encryption...');
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
                           
      console.log('📝 Auth message to sign for encryption:', messageToSign);

      // Step 2: Sign the message with user's wallet
      const signedMessage = await signMessageAsync({
        message: messageToSign
      });
      console.log('✅ Encryption message signed successfully');

      // Step 3: Upload file with encryption
      console.log('📤 Uploading file to server for encryption...');
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('publicKey', address);
      formData.append('signedMessage', signedMessage);
      formData.append('encrypted', 'true');
      formData.append('encryptionType', 'standard');
      
      // Set up request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
      
      try {
        // Use our API proxy to upload to the Lighthouse service
        const uploadResponse = await fetch('/api/lighthouse/upload', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!uploadResponse.ok) {
          let errorMessage = 'Upload failed';
          try {
            const errorData = await uploadResponse.json();
            errorMessage = errorData.error || `Upload failed with status ${uploadResponse.status}`;
          } catch (e) {
            errorMessage = `Upload failed with status ${uploadResponse.status}`;
          }
          throw new Error(errorMessage);
        }
        
        const responseData = await uploadResponse.json();
        console.log('✅ Server-side encryption response:', responseData);
        
        if (!responseData.success) {
          throw new Error(responseData.error || 'Upload failed on the server');
        }
        
        // Check if the file was actually encrypted
        if (!responseData.encrypted) {
          console.warn('⚠️ File was uploaded but not encrypted');
        }
        
        setUploadSuccess(true);
        setUploadedFileHash(responseData.hash);
        setUploadedFileName(file.name);
        
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Upload request timed out. Server may be overloaded or unresponsive.');
        }
        throw fetchError;
      }
      
    } catch (error) {
      console.error('❌ Server-side encryption failed:', error);
      setUploadError(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">🔐 Upload Encrypted File</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Select File to Encrypt</h2>
        
        <div className="mb-6">
          <FileUploader
            handleChange={handleFileChange}
            name="file"
            types={fileTypes}
            classes="w-full"
          >
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 cursor-pointer">
              <p className="text-lg mb-2">Drag & Drop or Click to Browse</p>
              <p className="text-sm text-gray-500">
                Supported formats: {fileTypes.join(', ')}
              </p>
              {file && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-600">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>
          </FileUploader>
        </div>
        
        {!isConnected && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
            <p className="font-semibold">Connect your wallet</p>
            <p className="text-sm">You need to connect your wallet to encrypt files.</p>
          </div>
        )}
        
        <button
          onClick={handleServerSideEncryption}
          disabled={!file || isUploading || !isConnected}
          className={`w-full py-2 px-4 rounded-md font-medium ${
            !file || isUploading || !isConnected
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isUploading ? 'Encrypting...' : '1. Encrypt & Upload File'}
        </button>
        
        {uploadError && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {uploadError}
          </div>
        )}
        
        {uploadSuccess && uploadedFileHash && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="font-semibold text-green-800 mb-2">
              ✅ File encrypted and uploaded successfully!
            </p>
            <p className="mb-2">
              <span className="font-medium">File:</span> {uploadedFileName}
            </p>
            <p className="mb-4">
              <span className="font-medium">CID:</span> {uploadedFileHash}
            </p>
            
            <div className="flex flex-col space-y-3">
              <Link 
                href={`/view-file/${uploadedFileHash}`}
                className="inline-block bg-blue-600 text-white text-center py-2 px-4 rounded hover:bg-blue-700"
              >
                2. Manage Access (Share & Revoke)
              </Link>
              
              <Link 
                href={`/decrypt-file/${uploadedFileHash}`}
                className="inline-block bg-green-600 text-white text-center py-2 px-4 rounded hover:bg-green-700"
              >
                3. Decrypt & View File
              </Link>
              
              <a 
                href={`https://gateway.lighthouse.storage/ipfs/${uploadedFileHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-purple-600 text-white text-center py-2 px-4 rounded hover:bg-purple-700"
              >
                4. View on IPFS Gateway
              </a>
            </div>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-semibold mb-2">About Encrypted File Storage</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Files are encrypted using BLS encryption</li>
            <li>Only you and wallets you share with can decrypt the file</li>
            <li>Files are stored on IPFS and Filecoin</li>
            <li>You can revoke access at any time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}