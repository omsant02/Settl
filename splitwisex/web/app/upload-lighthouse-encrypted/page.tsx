'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { FileUploader } from "react-drag-drop-files";

export default function UploadLighthouseEncrypted() {
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  // Fetch API key on component mount
  useEffect(() => {
    async function fetchApiKey() {
      try {
        const response = await fetch('/api/lighthouse/get-api-key');
        const data = await response.json();
        if (data.success) {
          setApiKey(data.apiKey);
          console.log('✅ API key retrieved successfully');
        } else {
          console.error('❌ Failed to retrieve API key:', data.error);
        }
      } catch (error) {
        console.error('❌ Error fetching API key:', error);
      }
    }
    
    fetchApiKey();
  }, []);
  
  const handleFileChange = (file: File | File[]) => {
    // Ensure we're handling a single file
    const singleFile = Array.isArray(file) ? file[0] : file;
    setFile(singleFile);
    setUploadResult(null);
    setUploadError(null);
  };
  
  const handleEncryptedUpload = async () => {
    if (!file || !isConnected || !address) {
      setUploadError('Please connect your wallet and select a file first');
      return;
    }
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      console.log('🔐 Starting encrypted upload...', {
        fileName: file.name,
        fileSize: file.size,
        isConnected,
        address
      });
      
      await handleServerSideEncryption();
    } catch (error) {
      console.error('❌ Upload failed:', error);
      setUploadError(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleServerSideEncryption = async () => {
    if (!file || !apiKey || !address) return;
    
    console.log('🖥️ Using server-side encryption via backend');
    
    try {
      // Step 1: Get authentication message
      console.log('📋 Getting auth message for encryption...');
      const authMessageResponse = await fetch('/api/lighthouse/auth-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: address })
      });
      
      const authMessageData = await authMessageResponse.json();
      console.log('📝 Auth message to sign for encryption:', authMessageData.message);
      
      // Step 2: Sign the message with user's wallet
      const signedMessage = await signMessageAsync({ 
        message: authMessageData.message 
      });
      console.log('✅ Encryption message signed successfully');
      console.log('🔑 Signed message:', signedMessage);
      
      // Step 3: Prepare form data for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('publicKey', address);
      formData.append('signedMessage', signedMessage);
      // IMPORTANT: Explicitly set encrypted flag to true
      formData.append('encrypted', 'true');
      formData.append('encryptionType', 'standard');
      
      console.log('👤 Public key (address):', address);
      console.log('📦 FormData prepared with encryption parameters (explicitly set encrypted=true)');
      
      // Step 4: Upload with encryption via our backend
      console.log('📤 Sending request to /api/lighthouse/upload...');
      
      // Add timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout (2 minutes)
      
      try {
        const uploadResponse = await fetch('/api/lighthouse/upload', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Server responded with ${uploadResponse.status}: ${errorText}`);
        }
        
        const uploadData = await uploadResponse.json();
        console.log('✅ Upload response:', uploadData);
        
        // Verify if the upload was actually encrypted
        const isEncrypted = uploadData.encrypted === true || 
                           (typeof uploadData.data === 'object' && uploadData.data.encrypted === true);
        
        if (uploadData.success) {
          setUploadResult({
            success: true,
            fileName: file.name,
            fileSize: (file.size / (1024 * 1024)).toFixed(2),
            hash: uploadData.hash || uploadData.cid || 
                 (uploadData.data && (uploadData.data.Hash || uploadData.data.hash || uploadData.data.cid)),
            isEncrypted: isEncrypted
          });
          
          if (!isEncrypted) {
            console.warn('⚠️ Warning: File was uploaded but may not be encrypted despite request');
          }
        } else {
          throw new Error(uploadData.error || 'Upload failed');
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error('Upload request timed out. Server may be overloaded or unresponsive.');
        }
        throw error;
      }
    } catch (error) {
      console.error('❌ Server-side encryption failed:', error);
      throw error;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Upload files with end-to-end encryption to Filecoin via Lighthouse</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Encryption Always Enabled</h2>
          <p className="text-gray-600">
            All files uploaded through this route are automatically encrypted. 
            Only you can decrypt them with your wallet.
          </p>
        </div>
        
        <div className="mb-6">
          <FileUploader
            handleChange={handleFileChange}
            name="file"
            label="Choose File to Encrypt"
            hoverTitle="Drop file here"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
            </p>
          )}
        </div>
        
        <button
          onClick={handleEncryptedUpload}
          disabled={!file || isUploading || !isConnected}
          className={`w-full py-2 px-4 rounded-md font-medium ${
            !file || isUploading || !isConnected
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isUploading ? '🔐 Encrypting & Uploading...' : '🔐 Encrypt & Upload to Filecoin'}
        </button>
        
        {uploadError && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {uploadError}
          </div>
        )}
      </div>
      
      {uploadResult && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">🔐 Encrypted Upload Result:</h2>
          <div className="space-y-2">
            <p><strong>File:</strong> {uploadResult.fileName}</p>
            <p><strong>Size:</strong> {uploadResult.fileSize} MB</p>
            <p><strong>Status:</strong> {uploadResult.isEncrypted 
              ? '🔐 Encrypted' 
              : '⚠️ Note: File uploaded successfully, but encryption failed'}</p>
            {uploadResult.hash && (
              <>
                <p className="break-all"><strong>CID:</strong> {uploadResult.hash}</p>
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">
                    {uploadResult.isEncrypted 
                      ? '✅ Successfully Encrypted: Your file is now securely stored on Filecoin. Only you can decrypt it with your connected wallet.'
                      : '⚠️ Warning: Your file was uploaded but NOT encrypted. Anyone can access it.'}
                  </h3>
                  <div className="flex space-x-4 mt-4">
                    <a
                      href={`https://decrypt.mesh3.network/evm/${uploadResult.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      🔓 Decrypt & View File
                    </a>
                    <a
                      href={`/view-file/${uploadResult.hash}`}
                      className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      View in App
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}