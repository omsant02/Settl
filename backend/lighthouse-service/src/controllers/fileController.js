import express from 'express';
import lighthouseService from '../services/lighthouseService.js';
import { formatFileSize, createResponse, createError } from '../utils/helpers.js';

const router = express.Router();

/**
 * Get file information
 * GET /file/info/:hash
 */
router.get('/info/:hash', async (req, res, next) => {
  try {
    const { hash } = req.params;
    
    if (!hash) {
      throw createError('Hash is required', 400);
    }
    
    console.log('🔍 Getting file info for:', hash);
    const fileInfo = await lighthouseService.getFileInfo(hash);
    
    if (!fileInfo) {
      throw createError('File not found', 404);
    }
    
    // Return the raw fileInfo structure to ensure we don't lose any data
    res.json({
      success: true,
      data: fileInfo.data || fileInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Download/proxy file by hash
 * GET /file/download/:hash
 */
router.get('/download/:hash', async (req, res, next) => {
  try {
    const { hash } = req.params;
    
    if (!hash) {
      throw createError('Hash is required', 400);
    }
    
    console.log('📥 Downloading file:', hash);
    
    // Download file using direct gateway URL
    const gatewayUrl = `https://gateway.lighthouse.storage/ipfs/${hash}`;
    const fileResponse = await fetch(gatewayUrl);
    
    if (!fileResponse.ok) {
      throw createError('File not found', 404);
    }
    
    // Proxy the file response
    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    const arrayBuffer = await fileResponse.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
    
  } catch (error) {
    next(error);
  }
});

/**
 * Decrypt and download encrypted file
 * POST /file/decrypt/:hash
 */
router.post('/decrypt/:hash', async (req, res, next) => {
  try {
    const { hash } = req.params;
    const { publicKey, signedMessage, mimeType } = req.body;
    
    if (!hash || !publicKey || !signedMessage) {
      throw createError('Hash, public key, and signed message are required', 400);
    }
    
    console.log('🔓 Decrypting file:', hash, 'for user:', publicKey);
    
    try {
      const decryptedFile = await lighthouseService.decryptFile(
        hash,
        publicKey,
        signedMessage,
        mimeType || null
      );
      
      if (!decryptedFile) {
        throw createError('Failed to decrypt file', 500);
      }
      
      console.log('✅ File decrypted successfully');
      
      // Try to determine the content type
      let contentType = mimeType || 'application/octet-stream';
      
      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${hash}"`);
      res.setHeader('Content-Length', decryptedFile.byteLength || decryptedFile.length);
      res.setHeader('X-Content-Type-Detected', contentType);
      
      // Send the decrypted file
      res.send(Buffer.from(decryptedFile));
      
    } catch (error) {
      console.error('❌ Decryption error:', error);
      throw createError(`Decryption failed: ${error.message}`, 500);
    }
    
  } catch (error) {
    next(error);
  }
});

/**
 * View encrypted image (for browser viewing)
 * POST /file/view/:hash
 */
router.post('/view/:hash', async (req, res, next) => {
  try {
    const { hash } = req.params;
    const { publicKey, signedMessage } = req.body;
    
    if (!hash) {
      throw createError('Hash is required', 400);
    }
    
    console.log('🖼️ Viewing image:', hash);
    
    if (publicKey && signedMessage) {
      try {
        // Try to decrypt the file for viewing
        const decryptedFile = await lighthouseService.decryptFile(
          hash,
          publicKey,
          signedMessage,
          'image/jpeg'
        );
        
        if (decryptedFile) {
          console.log('✅ Image decrypted successfully for viewing');
          
          // Send the decrypted file
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Content-Disposition', 'inline');
          res.send(Buffer.from(decryptedFile));
          return;
        }
      } catch (decryptError) {
        console.error('❌ Decryption failed, falling back to public gateway:', decryptError.message);
      }
    }
    
    // Fall back to public gateway if decryption fails
    console.log('📥 Fetching from public gateway');
    const gatewayUrl = `https://gateway.lighthouse.storage/ipfs/${hash}`;
    const fileResponse = await fetch(gatewayUrl);
    
    if (!fileResponse.ok) {
      throw createError('File not found', 404);
    }
    
    // Proxy the file response
    const contentType = fileResponse.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    const arrayBuffer = await fileResponse.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
    
  } catch (error) {
    next(error);
  }
});

export default router;
