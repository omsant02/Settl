import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import lighthouse from '@lighthouse-web3/sdk';
import * as lighthouseJS from './lighthouse-js-sdk.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto'; // Import crypto for file hashing

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3002;

// Enable CORS for all routes
app.use(cors());

// Parse JSON body for non-file requests
app.use(express.json());

// Configure Multer for file uploads
const storage = multer.memoryStorage(); // Store file in memory as a Buffer
const upload = multer({ storage: storage });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Lighthouse Filecoin Storage (JS SDK)',
    timestamp: new Date().toISOString()
  });
});

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
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

    // Get API key - hardcoded for development only, should be in env var for production
    const apiKey = process.env.LIGHTHOUSE_API_KEY || "623716f8.d6aa8f13ef724b4f9501f4c76de9c581";
    console.log('🔑 Using API key:', apiKey.substring(0, 8) + '...');
    if (!apiKey) {
      throw new Error('Lighthouse API key not found');
    }

    let result;

    // Create a local file in the project directory instead of using system temp
    const fileHash = crypto.createHash('md5').update(req.file.buffer).digest('hex');

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, 'uploads');
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

    if (encrypted === 'true') {
      try {
        console.log('🔐 Using direct encrypted upload method');
        console.log('👤 File owner will be:', publicKey);
        console.log('📤 Performing direct encrypted upload...');

        // This is the most direct way to upload encrypted files
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
              mimetype: req.file.mimetype,
              encrypted: true,
              publicKey: publicKey,
              note: 'Direct encrypted upload successful'
            };

            console.log('ℹ️ Keeping temporary file for successful upload');
            return res.json(result);
          }
        }

        throw new Error('No hash returned from upload - invalid response format');
      } catch (directUploadError) {
        console.error('❌ Direct encrypted upload failed:', directUploadError.message);

        // Try fallback method - regular upload first
        console.log('🔄 Trying fallback: regular upload first...');

        try {
          // First, do a regular non-encrypted upload
          const uploadResponse = await lighthouse.upload(
            tempFilePath,
            apiKey
          );

          console.log('✅ Regular upload successful:', JSON.stringify(uploadResponse));

          if (uploadResponse && uploadResponse.data && uploadResponse.data.Hash) {
            const cid = uploadResponse.data.Hash;
            console.log('🔑 CID obtained from regular upload:', cid);

            // Return success with the CID but mark as not encrypted
            return res.json({
              success: true,
              hash: cid,
              name: req.file.originalname,
              size: req.file.size,
              mimetype: req.file.mimetype,
              encrypted: false,
              publicKey: publicKey,
              note: 'Upload successful but not encrypted'
            });
          }
        } catch (fallbackError) {
          console.error('❌ Fallback upload also failed:', fallbackError.message);
          throw fallbackError;
        } finally {
          // Clean up temp file
          try {
            console.log('🧹 Cleaning up temporary file:', tempFilePath);
            fs.unlinkSync(tempFilePath);
            console.log('✅ Temporary file cleanup completed');
          } catch (e) {
            console.error('⚠️ Failed to clean up temp file:', e.message);
          }
        }
      }
    } else {
      // Use standard upload (non-encrypted) with JS SDK
      console.log('📤 Using standard upload (non-encrypted)');

      try {
        // Upload file using Lighthouse SDK
        const response = await lighthouse.upload(tempFilePath, apiKey);

        // Clean up temporary file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (e) {
          console.error('Failed to clean up temp file:', e.message);
        }

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
          return res.json(result);
        }
        throw new Error('No hash returned from standard upload - invalid response format');
      } catch (standardUploadError) {
        console.error('❌ Standard upload failed:', standardUploadError.message);
        return res.status(500).json({
          success: false,
          error: standardUploadError.message || 'Standard upload failed'
        });
      }
    }
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get file info by hash
app.get('/file-info/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    if (!hash) {
      return res.status(400).json({
        success: false,
        error: 'Hash is required'
      });
    }

    console.log('🔍 Getting file info for:', hash);
    const fileInfo = await lighthouseJS.getFileInfo(hash);

    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    console.log('✅ File info:', fileInfo);

    // Return the raw fileInfo structure to ensure we don't lose any data
    res.json({
      success: true,
      data: fileInfo.data || fileInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Download/proxy file by hash
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

// Decrypt and download encrypted file
app.post('/decrypt/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const { publicKey, signedMessage, mimeType } = req.body;

    if (!hash || !publicKey || !signedMessage) {
      return res.status(400).json({
        success: false,
        error: 'Hash, public key, and signed message are required'
      });
    }

    console.log('🔓 Decrypting file:', hash, 'for user:', publicKey);

    try {
      // Step 1: Fetch the encryption key
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
      
      // Use mimeType if provided, otherwise null to auto-detect
      const decryptedFile = await lighthouse.decryptFile(
        hash,
        encryptionKey,
        mimeType || null
      );

      if (!decryptedFile) {
        throw new Error('Failed to decrypt file');
      }

      console.log('✅ File decrypted successfully');
      console.log('📊 Decrypted file size:', decryptedFile.byteLength || decryptedFile.length, 'bytes');
      
      // Try to determine the content type from the decrypted file
      let contentType = mimeType || 'application/octet-stream';
      
      // If it's an image, try to detect the format from the magic bytes
      if (decryptedFile && decryptedFile.length > 4) {
        const header = decryptedFile.slice(0, 4);
        
        // Check for common image formats
        if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
          contentType = 'image/jpeg';
        } else if (
          header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47
        ) {
          contentType = 'image/png';
        } else if (
          header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46
        ) {
          contentType = 'image/gif';
        } else if (
          header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46
        ) {
          contentType = 'image/webp';
        }
      }
      
      console.log('🔤 Detected content type:', contentType);

      // Send the decrypted file back to the client with the detected content type
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${hash}"`);
      res.setHeader('Content-Length', decryptedFile.byteLength || decryptedFile.length);
      res.setHeader('X-Content-Type-Detected', contentType); // Custom header for debugging
      res.send(Buffer.from(decryptedFile));

    } catch (decryptError) {
      console.error('❌ Decryption error:', decryptError.message);
      
      // Try alternative decryption method
      try {
        console.log('🔄 Trying alternative decryption method...');
        
        // Use the decrypt function from our JS SDK wrapper
        const decryptedData = await lighthouseJS.decryptFile(hash, publicKey, signedMessage);
        
        if (!decryptedData) {
          throw new Error('Alternative decryption failed');
        }
        
        console.log('✅ Alternative decryption successful');
        console.log('📊 Decrypted file size:', decryptedData.byteLength || decryptedData.length, 'bytes');
        
        // Try to determine content type
        let contentType = mimeType || 'application/octet-stream';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${hash}"`);
        res.setHeader('Content-Length', decryptedData.byteLength || decryptedData.length);
        res.setHeader('X-Content-Type-Detected', contentType); // Custom header for debugging
        res.send(Buffer.from(decryptedData));
        
      } catch (altError) {
        console.error('❌ Alternative decryption also failed:', altError.message);
        
        // If both methods fail, return error
        throw new Error('All decryption methods failed: ' + decryptError.message);
      }
    }
  } catch (error) {
    console.error('Decryption error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// View encrypted image (for browser viewing)
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

    if (publicKey && signedMessage) {
      console.log('🔓 Attempting to decrypt file for viewing');
      try {
        // Step 1: Fetch the encryption key
        const keyResponse = await lighthouse.fetchEncryptionKey(
          hash,
          publicKey,
          signedMessage
        );

        if (!keyResponse || !keyResponse.data || !keyResponse.data.key) {
          throw new Error('Failed to fetch encryption key');
        }

        const encryptionKey = keyResponse.data.key;

        // Step 2: Decrypt the file using the key
        // Use image/jpeg as default MIME type for images
        const decryptedFile = await lighthouse.decryptFile(
          hash,
          encryptionKey,
          'image/jpeg'
        );

        if (!decryptedFile) {
          throw new Error('Failed to decrypt file');
        }

        console.log('✅ Image decrypted successfully for viewing');

        // Send the decrypted file back to the client
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', 'inline');
        res.send(Buffer.from(decryptedFile));
        return;
      } catch (decryptError) {
        console.error('❌ Decryption failed, falling back to public gateway:', decryptError.message);
      }
    }

    // If decryption fails or no keys provided, fall back to public gateway
    console.log('📥 Fetching from public gateway');
    const gatewayUrl = `https://gateway.lighthouse.storage/ipfs/${hash}`;
    const fileResponse = await fetch(gatewayUrl);

    if (!fileResponse.ok) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Proxy the file response
    const contentType = fileResponse.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const arrayBuffer = await fileResponse.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));

  } catch (error) {
    console.error('View image error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get auth message for signing
app.get('/auth-message/:address', async (req, res) => {
  try {
    const { address } = req.params;
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    console.log('📋 Getting auth message for:', address);
    const authMessage = await lighthouse.getAuthMessage(address);

    console.log('✅ Auth message:', authMessage);
    
    const message = authMessage.data.message;
    console.log('✅ Auth message retrieved:', message);

    res.json({
      success: true,
      message: message,
      data: authMessage.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get auth message error:', error);
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
  console.log(`- Decrypt: POST http://localhost:${port}/decrypt/:hash`);
  console.log(`- View Image: POST http://localhost:${port}/view-image/:hash`);
  console.log(`- Auth Message: GET http://localhost:${port}/auth-message/:address`);
});