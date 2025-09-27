import lighthouse from '@lighthouse-web3/sdk';
import kavach from '@lighthouse-web3/kavach';

// Get API key from environment variables
const LIGHTHOUSE_API_KEY = process.env.LIGHTHOUSE_API_KEY || "623716f8.d6aa8f13ef724b4f9501f4c76de9c581";

/**
 * LighthouseService - Core functions for interacting with Lighthouse SDK
 */
class LighthouseService {
  
  /**
   * Upload encrypted file to Lighthouse network
   */
  async uploadEncrypted(filePath, publicKey, signedMessage) {
    try {
      console.log('🔐 Using direct encrypted upload method');
      console.log('👤 File owner will be:', publicKey);
      console.log('📤 Performing direct encrypted upload...');
      
      // Upload encrypted file
      const response = await lighthouse.uploadEncrypted(
        filePath,
        LIGHTHOUSE_API_KEY,
        publicKey,
        signedMessage
      );
      
      console.log('✅ Encrypted upload response:', JSON.stringify(response));
      return response;
      
    } catch (error) {
      console.error('❌ Encrypted upload failed:', error);
      throw error;
    }
  }
  
  /**
   * Upload public (non-encrypted) file to Lighthouse
   */
  async upload(filePath) {
    try {
      console.log('📤 Using standard upload (non-encrypted)');
      
      // Upload file
      const response = await lighthouse.upload(filePath, LIGHTHOUSE_API_KEY);
      return response;
      
    } catch (error) {
      console.error('❌ Standard upload failed:', error);
      throw error;
    }
  }
  
  /**
   * Get file information from Lighthouse
   */
  async getFileInfo(hash) {
    try {
      console.log('🔍 Getting file info for:', hash);
      const fileInfo = await lighthouse.getFileInfo(hash);
      
      if (!fileInfo) {
        throw new Error('File not found');
      }
      
      console.log('✅ File info:', fileInfo);
      return fileInfo;
      
    } catch (error) {
      console.error('❌ Failed to get file info:', error);
      throw error;
    }
  }
  
  /**
   * Share encrypted file with another wallet
   */
  async shareFile(publicKey, shareAddresses, hash, signedMessage) {
    try {
      console.log('🔗 Sharing file:', hash);
      console.log('👤 Owner:', publicKey);
      console.log('🔄 Sharing with:', shareAddresses);
      
      const shareResponse = await lighthouse.shareFile(
        publicKey,
        shareAddresses,
        hash,
        signedMessage
      );
      
      console.log('✅ Share response:', JSON.stringify(shareResponse));
      return shareResponse;
      
    } catch (error) {
      console.error('❌ Share file error:', error);
      throw error;
    }
  }
  
  /**
   * Revoke access to a shared file
   */
  async revokeFileAccess(publicKey, revokeAddresses, hash, signedMessage) {
    try {
      console.log('🚫 Revoking access for file:', hash);
      console.log('👤 Owner:', publicKey);
      console.log('🔄 Revoking access from:', revokeAddresses);
      
      const revokeResponse = await lighthouse.revokeFileAccess(
        publicKey,
        revokeAddresses,
        hash,
        signedMessage
      );
      
      console.log('✅ Revoke response:', revokeResponse);
      return revokeResponse;
      
    } catch (error) {
      console.error('❌ Revoke access error:', error);
      throw error;
    }
  }
  
  /**
   * Get authentication message for signing
   */
  async getAuthMessage(address) {
    try {
      console.log('📋 Getting auth message for:', address);
      const authMessage = await lighthouse.getAuthMessage(address);
      
      console.log('✅ Auth message:', authMessage);
      return authMessage;
      
    } catch (error) {
      console.error('❌ Get auth message error:', error);
      throw error;
    }
  }
  
  /**
   * Get access conditions for a file
   */
  async getAccessConditions(hash) {
    try {
      console.log('🔍 Getting access conditions for:', hash);
      return await lighthouse.getAccessConditions(hash);
      
    } catch (error) {
      console.error('❌ Error getting access conditions:', error);
      throw error;
    }
  }
  
  /**
   * Decrypt a file
   */
  async decryptFile(hash, publicKey, signedMessage, mimeType = null) {
    try {
      console.log('🔓 Decrypting file:', hash, 'for user:', publicKey);
      
      // Step 1: Fetch encryption key
      console.log('🔑 Fetching encryption key from Lighthouse...');
      const keyResponse = await lighthouse.fetchEncryptionKey(
        hash,
        publicKey,
        signedMessage
      );
      
      if (!keyResponse || !keyResponse.data || !keyResponse.data.key) {
        throw new Error('Failed to fetch encryption key');
      }
      
      const encryptionKey = keyResponse.data.key;
      console.log('✅ Encryption key retrieved successfully');
      
      // Step 2: Decrypt the file using the key
      console.log('🔓 Decrypting file using the encryption key...');
      const decryptedFile = await lighthouse.decryptFile(
        hash,
        encryptionKey,
        mimeType
      );
      
      if (!decryptedFile) {
        throw new Error('Failed to decrypt file');
      }
      
      console.log('✅ File decrypted successfully');
      return decryptedFile;
      
    } catch (error) {
      console.error('❌ Decryption error:', error);
      throw error;
    }
  }
  
  /**
   * Get user's uploads
   */
  async getUploads(publicKey, limit = 10) {
    try {
      console.log('📋 Getting uploads for:', publicKey);
      return await lighthouse.getUploads(publicKey, limit);
    } catch (error) {
      console.error('❌ Error getting uploads:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export default new LighthouseService();
