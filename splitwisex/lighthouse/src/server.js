import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import lighthouse from '@lighthouse-web3/sdk';
import * as lighthouseJS from './lighthouse-js-sdk.js';
import fetch from 'node-fetch';
import { Wallet } from 'ethers';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3002;

// Enable CORS for all routes
app.use(cors());

// Parse JSON body for non-file requests
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Lighthouse Filecoin Storage (JS SDK)',
    timestamp: new Date().toISOString()
  });
});

// Upload file endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    const { publicKey, signedMessage, encrypted, encryptionType } = req.body;

    console.log('📤 Uploading file:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      encrypted: encrypted === 'true',
      encryptionType: encryptionType || 'standard',
      hasPublicKey: !!publicKey,
      publicKeyLength: publicKey?.length,
      hasSignedMessage: !!signedMessage,
      signedMessageLength: signedMessage?.length
    });

    // Get API key - hardcoded for development only, should be in env var for production
    const apiKey = process.env.LIGHTHOUSE_API_KEY || "623716f8.d6aa8f13ef724b4f9501f4c76de9c581";
    console.log('🔑 Using API key:', apiKey.substring(0, 8) + '...');
    if (!apiKey) {
      throw new Error('Lighthouse API key not found');
    }

    let result;

    if (encrypted === 'true') {
      // Create a local file in the project directory instead of using system temp
      const fileHash = crypto.createHash('md5').update(req.file.buffer).digest('hex');
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('📁 Created uploads directory:', uploadsDir);
      }
      
      // Use a fixed location in project directory
      const tempFilePath = path.join(uploadsDir, `${fileHash}-${req.file.originalname}`);
      console.log('📁 Using local file path instead of system temp:', tempFilePath);
      
      // Write to the file directly with writeFileSync
      try {
        // Write buffer directly to file
        fs.writeFileSync(tempFilePath, req.file.buffer);
        console.log('✅ Successfully wrote data to file');
        
        // Double-check file size after writing
        const statsAfterWrite = fs.statSync(tempFilePath);
        if (statsAfterWrite.size !== req.file.buffer.length) {
          console.warn('⚠️ Warning: File size mismatch after write');
          console.warn(`   Expected: ${req.file.buffer.length} bytes, Actual: ${statsAfterWrite.size} bytes`);
        } else {
          console.log('✓ File size verified after write:', statsAfterWrite.size, 'bytes');
        }
      } catch (writeErr) {
        console.error('❌ Failed to write temporary file:', writeErr.message);
        // Try to clean up
        try {
          fs.unlinkSync(tempFilePath);
        } catch (e) { /* ignore cleanup errors */ }
        return res.status(500).json({
          success: false,
          error: 'Failed to create temporary file: ' + writeErr.message
        });
      }
      
      // Additional logging for temporary file
      console.log('📊 Temp file details:');
      console.log('  - File exists:', fs.existsSync(tempFilePath));
      console.log('  - File size:', fs.statSync(tempFilePath).size, 'bytes');
      console.log('  - Original filename:', req.file.originalname);
      console.log('  - Temp filepath:', tempFilePath);
      console.log('  - Temp directory:', path.dirname(tempFilePath));

      try {
        // DIRECT APPROACH: Use uploadEncrypted directly
        console.log('🔐 Using direct encrypted upload method');
        console.log('👤 File owner will be:', publicKey);
        
        try {
          // This is the most direct way to upload encrypted files
          console.log('📤 Performing direct encrypted upload...');
          
          const response = await lighthouse.uploadEncrypted(
            tempFilePath,
            apiKey,
            publicKey,
            signedMessage
          );
          
          console.log('✅ Encrypted upload response:', JSON.stringify(response));
          
          // Parse response and return result
          if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
            const fileData = response.data[0];
            const hash = fileData.Hash || fileData.hash;
            
            if (hash) {
              result = {
                success: true,
                hash: hash,
                name: req.file.originalname,
                size: req.file.size,
                encrypted: true,
                publicKey: publicKey,
                note: 'Direct encrypted upload successful'
              };
              
              return res.json(result);
            }
          }
          
          throw new Error('No hash returned from upload - invalid response format');
        } catch (directUploadError) {
          console.error('❌ Direct encrypted upload failed:', directUploadError.message);
          
          // FALLBACK: Try regular upload
          console.log('🔄 Trying fallback: regular upload...');
          
          try {
            const uploadResponse = await lighthouse.upload(
              tempFilePath, 
              apiKey
            );
            
            console.log('✅ Regular upload successful:', JSON.stringify(uploadResponse));
            
            if (uploadResponse && uploadResponse.data && uploadResponse.data.Hash) {
              const hash = uploadResponse.data.Hash;
              
              result = {
                success: true,
                hash: hash,
                name: req.file.originalname,
                size: req.file.size,
                encrypted: false, // Not encrypted
                publicKey: publicKey,
                note: 'Upload successful but not encrypted'
              };
              
              return res.json(result);
            }
          } catch (fallbackError) {
            console.error('❌ Fallback upload also failed:', fallbackError.message);
            throw fallbackError;
          }
        }
      } catch (error) {
        console.error('❌ Encrypted upload failed:', error);
        
        // Detailed error logging for SDK debugging
        console.error('🔍 Detailed error analysis:');
        console.error('  - Error name:', error.name);
        console.error('  - Error code:', error.code);
        console.error('  - Has response object:', !!error.response);
        if (error.response) {
          console.error('  - Response status:', error.response.status);
          console.error('  - Response data:', JSON.stringify(error.response.data, null, 2));
        }
        
        // Check for specific Lighthouse/Kavach error patterns
        if (error.message?.includes('JWT')) {
          console.error('  - JWT authentication issue detected');
        }
        if (error.message?.includes('kavach')) {
          console.error('  - Kavach package issue detected');
        }
        if (error.message?.includes('network') || error.message?.includes('timeout')) {
          console.error('  - Network connectivity issue detected');
        }
        if (error.message?.includes('encrypt')) {
          console.error('  - Encryption process issue detected');
        }
        
        // Don't mask errors - bubble up the real failure
        return res.status(500).json({
          success: false,
          error: error.message || 'Unknown error during encryption',
          details: {
            name: error.name,
            code: error.code
          }
        });
      } finally {
        // Clean up temp file - only if this is not a successful upload
        if (!result || !result.success) {
          try { 
            console.log('🧹 Cleaning up temporary file:', tempFilePath);
            fs.unlinkSync(tempFilePath);
            console.log('✅ Temporary file cleanup completed');
          } catch (e) { 
            console.error('⚠️ Failed to clean up temp file:', e.message);
          }
        } else {
          console.log('ℹ️ Keeping temporary file for successful upload');
        }
      }
    } else {
      // Use standard upload (non-encrypted) with JS SDK
      console.log('📤 Using standard upload (non-encrypted)');

      try {
        // Create a local file in the project directory instead of using system temp
        const fileHash = crypto.createHash('md5').update(req.file.buffer).digest('hex');
        
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Use a fixed location in project directory
        const tempFilePath = path.join(uploadsDir, `${fileHash}-${req.file.originalname}`);
        
        // Write buffer directly to file
        fs.writeFileSync(tempFilePath, req.file.buffer);
        
        // Upload file using Lighthouse SDK
        const response = await lighthouse.upload(tempFilePath, apiKey);
        
        // Clean up temporary file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (e) {
          console.error('Failed to clean up temp file:', e.message);
        }
        
        // Parse response
        if (response && response.data && response.data.Hash) {
          result = {
            success: true,
            hash: response.data.Hash,
            name: req.file.originalname,
            size: req.file.size,
            encrypted: false
          };
          
          return res.json(result);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Standard upload error:', error);
        return res.status(500).json({
          success: false,
          error: error.message || 'Unknown error during upload'
        });
      }
    }

    // If we get here, something went wrong
    return res.status(500).json({
      success: false,
      error: 'Upload failed - unknown error'
    });
  } catch (error) {
    console.error('Upload endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
});

// Download file by hash
app.get('/download/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    if (!hash) {
      return res.status(400).json({
        success: false,
        error: 'Hash is required'
      });
    }

    console.log('📥 Downloading file:', hash);

    // Download file using direct gateway URL
    const gatewayUrl = `https://gateway.lighthouse.storage/ipfs/${hash}`;
    const fileResponse = await fetch(gatewayUrl);

    if (!fileResponse.ok) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Proxy the file response
    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const arrayBuffer = await fileResponse.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Share file with another wallet
app.post('/share/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const { publicKey, signedMessage, shareWith } = req.body;

    if (!hash || !publicKey || !signedMessage || !shareWith) {
      return res.status(400).json({
        success: false,
        error: 'Hash, publicKey, signedMessage, and shareWith are required'
      });
    }

    console.log('🔄 Sharing file:', hash, 'from:', publicKey, 'to:', shareWith);

    // Use JS SDK to share file
    const shareResponse = await lighthouse.shareFile(
      publicKey,
      shareWith,
      hash,
      signedMessage
    );

    res.json({
      success: true,
      data: shareResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Share file error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Revoke access to a file
app.post('/revoke/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const { publicKey, signedMessage, revokeFrom } = req.body;

    if (!hash || !publicKey || !signedMessage || !revokeFrom) {
      return res.status(400).json({
        success: false,
        error: 'Hash, publicKey, signedMessage, and revokeFrom are required'
      });
    }

    console.log('🔄 Revoking access to file:', hash, 'from:', revokeFrom);

    // Use JS SDK to revoke access
    const revokeResponse = await lighthouse.revokeFileAccess(
      publicKey,
      revokeFrom,
      hash,
      signedMessage
    );

    res.json({
      success: true,
      data: revokeResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Revoke access error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Apply access control to a file
app.post('/access-control/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const { publicKey, signedMessage, conditions, aggregator } = req.body;

    if (!hash || !publicKey || !signedMessage || !conditions || !aggregator) {
      return res.status(400).json({
        success: false,
        error: 'Hash, publicKey, signedMessage, conditions, and aggregator are required'
      });
    }

    console.log('🔄 Applying access control to file:', hash);

    // Use JS SDK to apply access control
    const accessResponse = await lighthouse.applyAccessCondition(
      publicKey,
      hash,
      signedMessage,
      conditions,
      aggregator
    );

    res.json({
      success: true,
      data: accessResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Access control error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// View image endpoint
app.post('/view-image/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const { publicKey, signedMessage } = req.body;

    if (!hash) {
      return res.status(400).json({
        success: false,
        error: 'Hash is required'
      });
    }

    console.log('🖼️ Viewing image:', hash);

    // If public key and signed message are provided, try to decrypt
    if (publicKey && signedMessage) {
      try {
        console.log('🔓 Attempting to decrypt file for viewing');
        const decryptedData = await lighthouse.decryptFile(hash, publicKey, signedMessage);
        
        if (decryptedData) {
          console.log('✅ File decrypted successfully');
          res.setHeader('Content-Type', 'image/jpeg'); // Assuming it's an image
          return res.send(Buffer.from(decryptedData));
        }
      } catch (decryptError) {
        console.error('❌ Decryption failed, falling back to public gateway:', decryptError.message);
      }
    }

    // Fallback to public gateway if decryption fails or not requested
    console.log('📥 Fetching from public gateway');
    const gatewayUrl = `https://gateway.lighthouse.storage/ipfs/${hash}`;
    const imageResponse = await fetch(gatewayUrl);

    if (!imageResponse.ok) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const arrayBuffer = await imageResponse.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));

  } catch (error) {
    console.error('View image error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get authentication message
app.get('/auth-message/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }
    
    console.log('📋 Getting auth message for address:', address);
    console.log('📋 Getting auth message for:', address);
    
    // Use JS SDK to get auth message
    const authMessage = await lighthouse.getAuthMessage(address);
    console.log('✅ Auth message:', authMessage);
    
    // Extract the message from the response
    const message = authMessage.data.message;
    console.log('✅ Auth message retrieved:', message);
    
    res.json({
      success: true,
      message: message,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Auth message error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Sign auth message with private key
app.post('/sign-auth-message', async (req, res) => {
  try {
    const { privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Private key is required'
      });
    }
    
    // Use ethers to derive address from private key
    const wallet = new Wallet(privateKey);
    const address = wallet.address;
    
    console.log('📋 Signing auth message for address:', address);

    // Use JS SDK helper to sign auth message
    const signedMessage = await lighthouseJS.signAuthMessage(privateKey);

    res.json({
      success: true,
      address: address,
      signedMessage: signedMessage,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sign auth message error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Lighthouse Filecoin Storage Server (JS SDK) listening on port ${port}`);
  console.log(`- Health: http://localhost:${port}/health`);
  console.log(`- Upload: POST http://localhost:${port}/upload`);
  console.log(`- Download: GET http://localhost:${port}/download/:hash`);
  console.log(`- Share File: POST http://localhost:${port}/share/:hash`);
  console.log(`- Revoke Access: POST http://localhost:${port}/revoke/:hash`);
  console.log(`- Access Control: POST http://localhost:${port}/access-control/:hash`);
  console.log(`- View Image: POST http://localhost:${port}/view-image/:hash`);
  console.log(`- Auth Message: GET http://localhost:${port}/auth-message/:address`);
});