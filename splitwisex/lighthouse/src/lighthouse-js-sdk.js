// Simple JavaScript implementation for Lighthouse SDK - ES Module
import lighthouse from '@lighthouse-web3/sdk';
import kavach from '@lighthouse-web3/kavach';
import { ethers } from 'ethers';

const LIGHTHOUSE_API_KEY = process.env.LIGHTHOUSE_API_KEY || '623716f8.d6aa8f13ef724b4f9501f4c76de9c581';

// Upload encrypted file - User-owned browser method
const uploadEncrypted = async (filePath, publicKey, signedMessage) => {
  try {
    console.log('📤 Uploading encrypted file (user-owned browser method)...');
    console.log('🔑 File Owner (publicKey):', publicKey);
    console.log('📝 Signed Message Length:', signedMessage.length);
    console.log('📄 File Path:', filePath);
    
    // Try direct buffer upload first if available
    try {
      console.log('🔄 Attempting buffer-based upload if available...');
      // Check if file exists and read as buffer
      const fs = await import('fs/promises');
      const fileBuffer = await fs.readFile(filePath);
      
      // Try uploadEncryptedData if available (newer SDK versions)
      if (lighthouse.uploadEncryptedData) {
        console.log('✅ Using buffer-based encryption method');
        const response = await lighthouse.uploadEncryptedData(
          fileBuffer,
          LIGHTHOUSE_API_KEY,
          publicKey,
          signedMessage
        );
        return response;
      } else {
        console.log('⚠️ Buffer-based upload not available, falling back to file path method');
      }
    } catch (bufferErr) {
      console.log('⚠️ Buffer method failed, falling back to file path:', bufferErr.message);
    }
    
    // Browser method signature: uploadEncrypted(file, apiKey, userAddress, signature)
    // publicKey = user's wallet address (file owner)
    // signedMessage = user's signature (authentication)
    console.log('📄 Using file path method with path:', filePath);
    const response = await lighthouse.uploadEncrypted(
      filePath,
      LIGHTHOUSE_API_KEY,
      publicKey,
      signedMessage
    );

    console.log('✅ Upload response:', response);
    return response;
  } catch (error) {
    console.error('❌ Upload failed:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response,
      data: error.data,
      status: error.status
    });

    // Log full error object to help with CID extraction
    console.error('❌ Full error for CID extraction:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    throw error;
  }
};

// Share encrypted file - following exact JS SDK pattern from docs
const shareFile = async (publicKey, publicKeyUserB, cid, signedMessage) => {
  try {
    console.log('🤝 Sharing file...');
    console.log('📁 CID:', cid);
    console.log('👤 Owner:', publicKey);
    console.log('👥 Share to:', publicKeyUserB);

    const shareResponse = await lighthouse.shareFile(
      publicKey,
      publicKeyUserB,
      cid,
      signedMessage
    );

    console.log('✅ Share response:', shareResponse);
    /* Sample Response
      {
        data: {
          cid: 'QmTsC1UxihvZYBcrA36DGpikiyR8ShosCcygKojHVdjpGd',
          shareTo: [ '0x487fc2fE07c593EAb555729c3DD6dF85020B5160' ],
          status: 'Success'
        }
      }
    */
    return shareResponse;
  } catch (error) {
    console.error('❌ Share failed:', error);
    throw error;
  }
};

// Get auth message for signing
const getAuthMessage = async (publicKey) => {
  try {
    console.log('📋 Getting auth message for:', publicKey);

    const authMessage = await lighthouse.getAuthMessage(publicKey);
    console.log('✅ Auth message:', authMessage);

    return authMessage;
  } catch (error) {
    console.error('❌ Failed to get auth message:', error);
    throw error;
  }
};

// Get JWT for encryption using kavach (recommended for server-side)
const getEncryptionJWT = async (publicKey, signedMessage) => {
  try {
    console.log('🔑 Converting browser signature to JWT for:', publicKey);
    console.log('📝 Using signed message length:', signedMessage.length);

    // The signed message from browser should work directly with kavach.getJWT
    // No need to get auth message again since frontend already signed the correct message
    const jwtResponse = await kavach.getJWT(publicKey, signedMessage);
    console.log('✅ JWT response:', jwtResponse);

    if (!jwtResponse.JWT) {
      throw new Error('No JWT returned from kavach');
    }

    return jwtResponse.JWT;
  } catch (error) {
    console.error('❌ Failed to get encryption JWT:', error);
    console.error('❌ JWT Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.status
    });
    throw error;
  }
};

// Decrypt file
const decryptFile = async (cid, publicKey, signedMessage) => {
  try {
    console.log('🔓 Decrypting file...');
    console.log('📁 CID:', cid);
    console.log('👤 Public Key:', publicKey);

    // First get the encryption key
    const keyObject = await lighthouse.fetchEncryptionKey(
      cid,
      publicKey,
      signedMessage
    );

    if (!keyObject.data?.key) {
      throw new Error('Failed to fetch decryption key');
    }

    console.log('🔑 Decryption key obtained');

    // Then decrypt the file
    const decrypted = await lighthouse.decryptFile(
      cid,
      keyObject.data.key,
      'image/jpeg' // Default MIME type for images
    );

    console.log('✅ File decrypted successfully');
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    throw error;
  }
};

// Upload regular (non-encrypted) file
const upload = async (filePath) => {
  try {
    console.log('📤 Uploading file (public)...');

    const response = await lighthouse.upload(filePath, LIGHTHOUSE_API_KEY);
    console.log('✅ Upload response:', response);

    return response;
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
};

// Get file info
const getFileInfo = async (cid) => {
  try {
    console.log('📋 Getting file info for:', cid);

    const fileInfo = await lighthouse.getFileInfo(cid);
    console.log('✅ File info:', fileInfo);

    return fileInfo;
  } catch (error) {
    console.error('❌ Failed to get file info:', error);
    throw error;
  }
};

// Helper function to sign auth messages
const signAuthMessage = async (privateKey) => {
  const provider = new ethers.JsonRpcProvider();
  const signer = new ethers.Wallet(privateKey, provider);
  const messageRequested = (await lighthouse.getAuthMessage(signer.address)).data.message;
  const signedMessage = await signer.signMessage(messageRequested);
  return signedMessage;
};

// Apply access conditions (token gating)
const applyAccessCondition = async (publicKey, cid, signedMessage, conditions, aggregator) => {
  try {
    console.log('🔐 Applying access conditions to file:', cid);

    const response = await lighthouse.applyAccessCondition(
      publicKey,
      cid,
      signedMessage,
      conditions,
      aggregator
    );

    console.log('✅ Access conditions applied:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to apply access conditions:', error);
    throw error;
  }
};

// Get access conditions for a file
const getAccessConditions = async (cid) => {
  try {
    console.log('📋 Getting access conditions for:', cid);

    const response = await lighthouse.getAccessConditions(cid);
    console.log('✅ Access conditions:', response);

    return response;
  } catch (error) {
    console.error('❌ Failed to get access conditions:', error);
    throw error;
  }
};

// Fetch encryption key for decryption
const fetchEncryptionKey = async (cid, publicKey, signedMessage) => {
  try {
    console.log('🔑 Fetching encryption key for:', cid);

    const key = await lighthouse.fetchEncryptionKey(
      cid,
      publicKey,
      signedMessage
    );

    console.log('✅ Encryption key fetched');
    return key;
  } catch (error) {
    console.error('❌ Failed to fetch encryption key:', error);
    throw error;
  }
};

// Revoke file access - following exact JS SDK pattern from docs
const revokeFileAccess = async (publicKey, publicKeyUserB, cid, signedMessage) => {
  try {
    console.log('🚫 Revoking file access...');
    console.log('📁 CID:', cid);
    console.log('👤 Owner:', publicKey);
    console.log('🚫 Revoke from:', publicKeyUserB);

    const revokeResponse = await lighthouse.revokeFileAccess(
      publicKey,
      publicKeyUserB,
      cid,
      signedMessage
    );

    console.log('✅ Revoke response:', revokeResponse);
    /* Sample Response
      {
        data: {
          cid: 'QmTsC1UxihvZYBcrA36DGpikiyR8ShosCcygKojHVdjpGd',
          revokeTo: [ '0x487fc2fE07c593EAb555729c3DD6dF85020B5160' ],
          status: 'Success'
        }
      }
    */
    return revokeResponse;
  } catch (error) {
    console.error('❌ Revoke access failed:', error);
    throw error;
  }
};

export {
  uploadEncrypted,
  shareFile,
  getAuthMessage,
  getEncryptionJWT,
  decryptFile,
  upload,
  getFileInfo,
  signAuthMessage,
  applyAccessCondition,
  getAccessConditions,
  fetchEncryptionKey,
  revokeFileAccess,
  LIGHTHOUSE_API_KEY
};