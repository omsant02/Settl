import express from 'express';
import lighthouseService from '../services/lighthouseService.js';
import ownershipService from '../services/ownershipService.js';
import { createResponse, createError } from '../utils/helpers.js';

const router = express.Router();

/**
 * Share encrypted file with another wallet
 * POST /access/share/:hash
 */
router.post('/share/:hash', async (req, res, next) => {
  try {
    const { hash } = req.params;
    const { publicKey, signedMessage, shareAddresses } = req.body;
    
    if (!hash || !publicKey || !signedMessage || !shareAddresses || !Array.isArray(shareAddresses)) {
      throw createError('Hash, publicKey, signedMessage, and shareAddresses array are required', 400);
    }
    
    console.log('🔗 Sharing file:', hash);
    console.log('👤 Owner:', publicKey);
    console.log('🔄 Sharing with:', shareAddresses);
    
    try {
      // First verify ownership
      const isOwner = ownershipService.checkOwnership(hash, publicKey);
      
      // If local ownership record exists and user is not the owner, deny access
      if (isOwner === false) {
        throw createError('Only the file owner can share access', 403);
      }
      
      // Use the Lighthouse SDK to share the file
      const shareResponse = await lighthouseService.shareFile(
        publicKey,
        shareAddresses,
        hash,
        signedMessage
      );
      
      if (!shareResponse) {
        throw createError('No response from shareFile SDK call', 500);
      }
      
      if (shareResponse.data && shareResponse.data.status === 'failed') {
        throw createError(shareResponse.data.message || 'Share operation failed', 400);
      }
      
      if (!shareResponse.data) {
        throw createError('Invalid share response: missing data property', 500);
      }
      
      res.json({
        success: true,
        data: shareResponse.data,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Share file error:', error);
      
      // Check for specific error types from the Lighthouse SDK
      const errorMessage = error.message || 'Unknown error';
      let statusCode = error.statusCode || 500;
      
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('Unauthorized')) {
        statusCode = 401;
        console.error('❌ Authentication error when sharing file - invalid signature');
      }
      
      throw createError(errorMessage, statusCode);
    }
    
  } catch (error) {
    next(error);
  }
});

/**
 * Revoke access to shared file
 * POST /access/revoke/:hash
 */
router.post('/revoke/:hash', async (req, res, next) => {
  try {
    const { hash } = req.params;
    const { publicKey, signedMessage, revokeAddresses } = req.body;
    
    if (!hash || !publicKey || !signedMessage || !revokeAddresses || !Array.isArray(revokeAddresses)) {
      throw createError('Hash, publicKey, signedMessage, and revokeAddresses array are required', 400);
    }
    
    console.log('🚫 Revoking access for file:', hash);
    console.log('👤 Owner:', publicKey);
    console.log('🔄 Revoking access from:', revokeAddresses);
    
    // First verify ownership
    const isOwner = ownershipService.checkOwnership(hash, publicKey);
    
    // If local ownership record exists and user is not the owner, deny access
    if (isOwner === false) {
      throw createError('Only the file owner can revoke access', 403);
    }
    
    // Use the Lighthouse SDK to revoke access
    const revokeResponse = await lighthouseService.revokeFileAccess(
      publicKey,
      revokeAddresses,
      hash,
      signedMessage
    );
    
    if (!revokeResponse || !revokeResponse.data) {
      throw createError('Invalid revoke response', 500);
    }
    
    res.json({
      success: true,
      data: revokeResponse.data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Check if wallet address is the owner of a file
 * POST /access/check-owner/:hash
 */
router.post('/check-owner/:hash', async (req, res, next) => {
  try {
    const { hash } = req.params;
    const { publicKey } = req.body;
    
    if (!hash || !publicKey) {
      throw createError('Hash and publicKey are required', 400);
    }
    
    console.log('🔍 Checking if wallet is file owner:', hash);
    console.log('👤 Wallet address:', publicKey);
    
    try {
      // Step 0: Check our local ownership records first (most reliable method)
      const localOwnership = ownershipService.checkOwnership(hash, publicKey);
      
      if (localOwnership === true) {
        return res.json({
          success: true,
          isOwner: true,
          data: { ownershipRecord: true },
          message: 'Wallet is the file owner (from local ownership records)',
          timestamp: new Date().toISOString()
        });
      } else if (localOwnership === false) {
        return res.json({
          success: true,
          isOwner: false,
          message: 'Wallet is not the file owner (confirmed by ownership records)',
          timestamp: new Date().toISOString()
        });
      }
      
      // Step 1: Try to check file access control conditions from Lighthouse
      try {
        const accessConditions = await lighthouseService.getAccessConditions(hash);
        
        if (accessConditions && accessConditions.data) {
          // Look for the wallet in the access control data
          const ownerData = accessConditions.data.find(item => 
            item.id && item.id.toLowerCase() === publicKey.toLowerCase()
          );
          
          if (ownerData) {
            console.log('✅ Wallet found in access control data - is owner');
            return res.json({
              success: true,
              isOwner: true,
              data: accessConditions.data,
              message: 'Wallet is the file owner (from access control data)',
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (accessError) {
        console.log('⚠️ Could not get access conditions:', accessError.message);
      }
      
      // Step 2: Try to check if the wallet can encrypt/decrypt the file
      try {
        // Get auth message
        const authMessage = await lighthouseService.getAuthMessage(publicKey);
        if (!authMessage || !authMessage.data || !authMessage.data.message) {
          throw new Error('Failed to get auth message');
        }
        
        // Try to get file information as this user
        const fileInfo = await lighthouseService.getUploads(publicKey, 1);
        
        // Check if this file is in the user's uploads
        if (fileInfo && fileInfo.data && Array.isArray(fileInfo.data.fileList)) {
          const isFileInUploads = fileInfo.data.fileList.some(file => 
            file.cid === hash
          );
          
          if (isFileInUploads) {
            console.log('✅ File found in user uploads - is owner');
            return res.json({
              success: true,
              isOwner: true,
              message: 'Wallet is the file owner (found in user uploads)',
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // If we can't verify ownership, default to not owner
        console.log('⚠️ Cannot verify file ownership');
        return res.json({
          success: true,
          isOwner: false, 
          message: 'Cannot verify ownership, defaulting to not owner',
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('❌ Error during ownership check:', error);
      }
      
      // If we've exhausted all checks and can't confirm ownership, default to not owner
      console.log('❓ Unable to determine ownership status, defaulting to not owner');
      return res.json({
        success: true,
        isOwner: false,
        message: 'Could not verify ownership, assuming not owner',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error checking ownership:', error);
      
      // If the error is related to the file not being encrypted, we can infer it's not owner-controlled
      if (error.message && error.message.includes('not encrypted')) {
        return res.json({
          success: true,
          isOwner: false,
          message: 'File is not encrypted, no ownership to check',
          timestamp: new Date().toISOString()
        });
      }
      
      throw createError(error.message || 'Failed to check ownership', 400);
    }
    
  } catch (error) {
    next(error);
  }
});

/**
 * List all files owned by a wallet
 * GET /access/owned-files/:publicKey
 */
router.get('/owned-files/:publicKey', async (req, res, next) => {
  try {
    const { publicKey } = req.params;
    
    if (!publicKey) {
      throw createError('Public key is required', 400);
    }
    
    const ownedFiles = ownershipService.getOwnedFiles(publicKey);
    
    res.json({
      success: true,
      data: {
        owner: publicKey,
        files: ownedFiles,
        count: ownedFiles.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    next(error);
  }
});

export default router;
