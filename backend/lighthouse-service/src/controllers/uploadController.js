import express from 'express';
import upload from '../middlewares/uploadMiddleware.js';
import lighthouseService from '../services/lighthouseService.js';
import storageService from '../services/storageService.js';
import ownershipService from '../services/ownershipService.js';
import { createResponse, createError } from '../utils/helpers.js';

const router = express.Router();

/**
 * Upload a file to Lighthouse
 * POST /upload
 */
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw createError('No file provided', 400);
    }

    const { publicKey, signedMessage, encrypted } = req.body;
    
    console.log('📤 Uploading file:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      encrypted: encrypted === 'true',
      hasPublicKey: !!publicKey,
      publicKeyLength: publicKey?.length,
      hasSignedMessage: !!signedMessage,
      signedMessageLength: signedMessage?.length
    });
    
    // Create temporary file from buffer
    const tempFilePath = storageService.createTempFile(req.file.buffer, req.file.originalname);
    
    let result;
    
    try {
      if (encrypted === 'true') {
        if (!publicKey || !signedMessage) {
          throw createError('Public key and signed message are required for encrypted uploads', 400);
        }
        
        // Upload encrypted file
        const response = await lighthouseService.uploadEncrypted(
          tempFilePath,
          publicKey,
          signedMessage
        );
        
        if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
          const fileData = response.data[0];
          const hash = fileData.Hash || fileData.hash;
          
          if (hash) {
            // Record ownership for later verification
            ownershipService.recordOwnership(hash, publicKey);
            
            result = {
              success: true,
              hash: hash,
              name: req.file.originalname,
              size: req.file.size,
              mimetype: req.file.mimetype,
              encrypted: true,
              publicKey: publicKey,
              note: 'Direct encrypted upload successful'
            };
            
            res.json(result);
            return;
          }
        }
        
        throw createError('No hash returned from upload - invalid response format', 500);
        
      } else {
        // Upload standard (non-encrypted) file
        const response = await lighthouseService.upload(tempFilePath);
        
        if (response && response.data && response.data.Hash) {
          const hash = response.data.Hash;
          
          result = {
            success: true,
            hash: hash,
            name: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            encrypted: false,
            note: 'Standard upload successful'
          };
          
          res.json(result);
          return;
        }
        
        throw createError('No hash returned from standard upload - invalid response format', 500);
      }
      
    } finally {
      // Clean up temporary file
      storageService.deleteFile(tempFilePath);
    }
    
  } catch (error) {
    next(error);
  }
});

export default router;
