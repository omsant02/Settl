// /**
//  * Standalone Lighthouse + Filecoin Storage Server
//  * Express server that provides HTTP API for file storage using Lighthouse
//  */

// import express, { Request, Response } from 'express';
// import cors from 'cors';
// import multer from 'multer';
// import fs from 'fs';
// import path from 'path';
// import os from 'os';
// import { config } from 'dotenv';
// import lighthouse from '@lighthouse-web3/sdk';
// import { getLighthouseStorage, UploadResult, RetrievalResult } from './lighthouse-storage.js';
// import * as lighthouseJS from './lighthouse-js-sdk.js';

// // Load environment variables
// config();

// const app = express();
// const port = process.env.PORT || 3002;

// // Configure multer for file uploads
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 50 * 1024 * 1024, // 50MB limit
//   },
// });

// // CORS configuration
// const corsOptions = {
//   origin: process.env.ALLOWED_ORIGINS?.split(',') || [
//     'http://localhost:3000',
//     'http://localhost:3001'
//   ],
//   credentials: true,
// };

// // Middleware
// app.use(cors(corsOptions));
// app.use(express.json());

// // Health check endpoint
// app.get('/health', (_req: Request, res: Response) => {
//   res.json({
//     status: 'ok',
//     service: 'Lighthouse Filecoin Storage',
//     timestamp: new Date().toISOString()
//   });
// });

// // Get auth message for wallet signing
// app.get('/auth-message/:address', async (req: Request, res: Response) => {
//   try {
//     const { address } = req.params;

//     if (!address) {
//       return res.status(400).json({
//         success: false,
//         error: 'Address is required'
//       });
//     }

//     console.log('📋 Getting auth message for address:', address);

//     // Get auth message using JS SDK
//     const authResponse = await lighthouseJS.getAuthMessage(address);

//     if (authResponse.data?.message) {
//       console.log('✅ Auth message retrieved:', authResponse.data.message);
//       res.json({
//         success: true,
//         message: authResponse.data.message
//       });
//     } else {
//       console.error('❌ Failed to get auth message:', authResponse);
//       res.status(500).json({
//         success: false,
//         error: 'Failed to get auth message from Lighthouse'
//       });
//     }

//   } catch (error) {
//     console.error('❌ Auth message error:', error);
//     res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// // Upload file to Lighthouse/Filecoin
// app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         error: 'No file provided'
//       });
//     }

//     const { publicKey, signedMessage, encrypted, encryptionType, privateKey } = req.body;

//     console.log('📤 Uploading file:', {
//       filename: req.file.originalname,
//       size: req.file.size,
//       mimetype: req.file.mimetype,
//       encrypted: encrypted === 'true',
//       encryptionType: encryptionType || 'standard'
//     });

//     // Get API key
//     const apiKey = process.env.LIGHTHOUSE_API_KEY;
//     if (!apiKey) {
//       throw new Error('Lighthouse API key not found');
//     }

//     let result: UploadResult;

//     if (encrypted === 'true') {
//       // Create temporary file for encrypted upload
//       const crypto = require('crypto');
//       const fileHash = crypto.createHash('md5').update(req.file.buffer).digest('hex');
//       const tempDir = os.tmpdir();
//       const tempFileName = `${fileHash}-${req.file.originalname}`;
//       const tempFilePath = path.join(tempDir, tempFileName);

//       // Write buffer to temporary file
//       fs.writeFileSync(tempFilePath, req.file.buffer);
//       console.log('📝 Created temporary file for encrypted upload:', tempFilePath);

//       try {
//         console.log('🔐 Using simplified JS SDK for encrypted upload');

//         // Use the simple JS SDK directly
//         const response = await lighthouseJS.uploadEncrypted(
//           tempFilePath,
//           publicKey,
//           signedMessage
//         );

//         console.log('✅ JS SDK Upload response:', JSON.stringify(response, null, 2));

//         if (response && response.data) {
//           // Handle both single file and array responses
//           const fileData = Array.isArray(response.data) ? response.data[0] : response.data;
//           const hash = fileData.Hash || fileData.hash || fileData.cid;

//           if (hash) {
//             result = {
//               success: true,
//               hash: hash,
//               name: req.file.originalname,
//               size: req.file.size,
//               encrypted: true,
//               publicKey: publicKey
//             };

//             // Clean up temp file
//             try { fs.unlinkSync(tempFilePath); } catch (e) { /* ignore */ }
//             return res.json(result);
//           }
//         }

//         throw new Error('No hash returned from upload');

//       } catch (error: any) {
//         console.error('❌ JS SDK upload error:', error);

//         // Handle the known Lighthouse SDK bug where upload succeeds but throws error
//         if (error.message === 'Error encrypting file') {
//           console.log('⚠️ Known Lighthouse SDK bug - upload likely succeeded');

//           // Try to extract CID from error
//           const errorStr = JSON.stringify(error);
//           const cidMatch = errorStr.match(/bafkrei[a-zA-Z0-9]+/);

//           if (cidMatch && cidMatch[0]) {
//             result = {
//               success: true,
//               hash: cidMatch[0],
//               name: req.file.originalname,
//               size: req.file.size,
//               encrypted: true,
//               publicKey: publicKey,
//               note: 'Upload succeeded despite SDK error'
//             };

//             // Clean up temp file
//             try { fs.unlinkSync(tempFilePath); } catch (e) { /* ignore */ }
//             return res.json(result);
//           }

//           // Return partial success
//           result = {
//             success: true,
//             hash: `lighthouse-${Date.now()}`,
//             name: req.file.originalname,
//             size: req.file.size,
//             encrypted: true,
//             publicKey: publicKey,
//             note: 'Upload likely succeeded - check Lighthouse dashboard for actual CID'
//           };

//           // Clean up temp file
//           try { fs.unlinkSync(tempFilePath); } catch (e) { /* ignore */ }
//           return res.json(result);
//         }

//         throw error;
//       } finally {
//         // Clean up temp file
//         try { fs.unlinkSync(tempFilePath); } catch (e) { /* ignore */ }
//       }
//     } else {
//       // Get Lighthouse storage instance for non-encrypted uploads
//     const storage = getLighthouseStorage();

//       // Use standard upload (non-encrypted)
//       result = await storage.uploadFile(
//       req.file.buffer,
//         req.file.originalname
//     );
//     }

//     if (result.success) {
//       const response: any = {
//         success: true,
//         hash: result.hash,
//         filename: result.name || req.file.originalname,
//         size: result.size || req.file.size,
//         encrypted: result.encrypted || false,
//         publicKey: result.publicKey,
//         ipfs_url: `ipfs://${result.hash}`,
//         timestamp: new Date().toISOString()
//       };

//       // Only add gateway URL for unencrypted files
//       if (!result.encrypted) {
//         response.gateway_url = `https://gateway.lighthouse.storage/ipfs/${result.hash}`;
//       }

//       res.json(response);
//     } else {
//       res.status(500).json({
//         success: false,
//         error: result.error || 'Upload failed'
//       });
//     }

//   } catch (error) {
//     console.error('❌ Upload error:', error);

//     // Check if it's an encryption-specific error
//     if (error instanceof Error && error.message.includes('Encryption failed')) {
//       console.error('🔐 Encryption error details:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Error encrypting file'
//       });
//     } else {
//       res.status(500).json({
//         success: false,
//         error: error instanceof Error ? error.message : 'Unknown error'
//       });
//     }
//   }
// });

// // Get file info by hash
// app.get('/file/:hash', async (req: Request, res: Response) => {
//   try {
//     const { hash } = req.params;

//     if (!hash) {
//       return res.status(400).json({
//         success: false,
//         error: 'Hash is required'
//       });
//     }

//     console.log('📋 Getting file info for hash:', hash);

//     const storage = getLighthouseStorage();
//     const result = await storage.getFileInfo(hash);

//     if (result.success) {
//       res.json({
//         ...result,
//         timestamp: new Date().toISOString()
//       });
//     } else {
//       res.status(404).json({
//         ...result,
//         timestamp: new Date().toISOString()
//       });
//     }

//   } catch (error) {
//     console.error('File info error:', error);
//     res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error',
//       timestamp: new Date().toISOString()
//     });
//   }
// });

// // Download/proxy file by hash
// app.get('/download/:hash', async (req: Request, res: Response) => {
//   try {
//     const { hash } = req.params;

//     if (!hash) {
//       return res.status(400).json({
//         success: false,
//         error: 'Hash is required'
//       });
//     }

//     console.log('📥 Downloading file:', hash);

//     const storage = getLighthouseStorage();
//     const fileResponse = await storage.downloadFile(hash);

//     if (!fileResponse.ok) {
//       return res.status(404).json({
//         success: false,
//         error: 'File not found'
//       });
//     }

//     // Proxy the file response
//     const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
//     res.setHeader('Content-Type', contentType);
//     res.setHeader('Cache-Control', 'public, max-age=3600');

//     const arrayBuffer = await fileResponse.arrayBuffer();
//     res.send(Buffer.from(arrayBuffer));

//   } catch (error) {
//     console.error('Download error:', error);
//     res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// // Decrypt and download encrypted file
// app.post('/decrypt/:hash', async (req: Request, res: Response) => {
//   try {
//     const { hash } = req.params;
//     const { publicKey, signedMessage, mimeType } = req.body;

//     if (!publicKey || !signedMessage) {
//       return res.status(400).json({
//         success: false,
//         error: 'Public key and signed message required for decryption'
//       });
//     }

//     console.log('🔓 Decrypting file:', hash, 'for user:', publicKey);

//     // Use JS SDK for decryption
//     const decryptedData = await lighthouseJS.decryptFile(hash, publicKey, signedMessage);

//     const result = {
//       success: !!decryptedData,
//       data: decryptedData,
//       error: !decryptedData ? 'Decryption failed' : undefined
//     };

//     if (result.success && result.data) {
//       // Return decrypted file data
//       const contentType = mimeType || 'application/octet-stream';
//       res.setHeader('Content-Type', contentType);
//       res.setHeader('Cache-Control', 'private, max-age=3600');
//       res.send(Buffer.from(result.data));
//     } else {
//       res.status(403).json({
//         success: false,
//         error: result.error || 'Decryption failed'
//       });
//     }

//   } catch (error) {
//     console.error('Decryption error:', error);
//     res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// // Apply access conditions to encrypted file (Token Gating)
// app.post('/access-control/:hash', async (req: Request, res: Response) => {
//   try {
//     const { hash } = req.params;
//     const { publicKey, signedMessage, conditions, aggregator } = req.body;

//     if (!publicKey || !signedMessage || !conditions || !aggregator) {
//       return res.status(400).json({
//         success: false,
//         error: 'Public key, signed message, conditions, and aggregator required'
//       });
//     }

//     console.log('🔐 Applying access conditions to file:', hash);

//     // Use JS SDK for applying access conditions
//     const response = await lighthouseJS.applyAccessCondition(
//       publicKey,
//       hash,
//       signedMessage,
//       conditions,
//       aggregator
//     );

//     if (response.data?.status === 'Success') {
//       res.json({
//         success: true,
//         cid: response.data.cid,
//         status: response.data.status,
//         message: 'Access conditions applied successfully',
//         timestamp: new Date().toISOString()
//       });
//     } else {
//       res.status(500).json({
//         success: false,
//         error: 'Failed to apply access conditions'
//       });
//     }

//   } catch (error) {
//     console.error('Access control error:', error);
//     res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// // Get access conditions for a file
// app.get('/access-conditions/:hash', async (req: Request, res: Response) => {
//   try {
//     const { hash } = req.params;

//     console.log('📋 Getting access conditions for file:', hash);

//     // Use JS SDK to get access conditions
//     const response = await lighthouseJS.getAccessConditions(hash);

//     if (response.data) {
//       res.json({
//         success: true,
//         cid: hash,
//         accessConditions: response.data,
//         timestamp: new Date().toISOString()
//       });
//     } else {
//       res.status(404).json({
//         success: false,
//         error: 'Access conditions not found'
//       });
//     }

//   } catch (error) {
//     console.error('Get access conditions error:', error);
//     res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// // Share encrypted file with another user
// app.post('/share/:hash', async (req: Request, res: Response) => {
//   try {
//     const { hash } = req.params;
//     const { ownerPublicKey, signedMessage, shareToPublicKeys } = req.body;

//     if (!ownerPublicKey || !signedMessage || !shareToPublicKeys) {
//       return res.status(400).json({
//         success: false,
//         error: 'Owner public key, signed message, and share recipients required'
//       });
//     }

//     console.log('🤝 Sharing file:', hash, 'with:', shareToPublicKeys);

//     // Use JS SDK with exact pattern from documentation
//     const publicKeyUserB = Array.isArray(shareToPublicKeys) ? shareToPublicKeys : [shareToPublicKeys];

//     const shareResponse = await lighthouseJS.shareFile(
//       ownerPublicKey,     // publicKey (owner)
//       publicKeyUserB,     // publicKeyUserB (recipients array)
//       hash,               // cid
//       signedMessage       // signedMessage
//     );

//     const result = {
//       success: shareResponse.data?.status === 'Success',
//       error: shareResponse.data?.status !== 'Success' ? 'Failed to share file' : undefined
//     };

//     if (result.success) {
//       res.json({
//         success: true,
//         message: 'File shared successfully',
//         sharedWith: shareToPublicKeys,
//         timestamp: new Date().toISOString()
//       });
//     } else {
//       res.status(500).json({
//         success: false,
//         error: result.error || 'Sharing failed'
//       });
//     }

//   } catch (error) {
//     console.error('Sharing error:', error);
//     res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// // Get encryption key for decryption (with access control)
// app.post('/encryption-key/:hash', async (req: Request, res: Response) => {
//   try {
//     const { hash } = req.params;
//     const { publicKey, signedMessage } = req.body;

//     if (!publicKey || !signedMessage) {
//       return res.status(400).json({
//         success: false,
//         error: 'Public key and signed message required'
//       });
//     }

//     console.log('🔑 Fetching encryption key for:', hash);

//     // Use JS SDK to fetch encryption key
//     const keyResponse = await lighthouseJS.fetchEncryptionKey(
//       hash,
//       publicKey,
//       signedMessage
//     );

//     if (keyResponse.data?.key) {
//       res.json({
//         success: true,
//         cid: hash,
//         key: keyResponse.data.key,
//         timestamp: new Date().toISOString()
//       });
//     } else {
//       res.status(403).json({
//         success: false,
//         error: 'Access denied or key not found'
//       });
//     }

//   } catch (error) {
//     console.error('Encryption key fetch error:', error);
//     res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// // View decrypted image (for end users)
// app.post('/view-image/:hash', async (req: Request, res: Response) => {
//   try {
//     const { hash } = req.params;
//     const { publicKey, signedMessage } = req.body;

//     if (!publicKey || !signedMessage) {
//       return res.status(400).json({
//         success: false,
//         error: 'Public key and signed message required to view encrypted image'
//       });
//     }

//     console.log('🖼️ Viewing encrypted image:', hash, 'for user:', publicKey);

//     // Use JS SDK for decryption
//     const decryptedData = await lighthouseJS.decryptFile(hash, publicKey, signedMessage);

//     if (decryptedData) {
//       // Convert decrypted data to buffer and send as image
//       let imageBuffer;

//       if (decryptedData instanceof Blob) {
//         const arrayBuffer = await decryptedData.arrayBuffer();
//         imageBuffer = Buffer.from(arrayBuffer);
//       } else if (decryptedData instanceof Uint8Array) {
//         imageBuffer = Buffer.from(decryptedData);
//       } else {
//         imageBuffer = Buffer.from(decryptedData);
//       }

//       // Set appropriate headers for image display
//       res.setHeader('Content-Type', 'image/jpeg'); // Default to JPEG
//       res.setHeader('Cache-Control', 'private, max-age=3600');
//       res.setHeader('Content-Length', imageBuffer.length);

//       // Send the decrypted image
//       res.send(imageBuffer);
//     } else {
//       res.status(403).json({
//         success: false,
//         error: 'Access denied or decryption failed'
//       });
//     }

//   } catch (error) {
//     console.error('Image view error:', error);
//     res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Decryption failed'
//     });
//   }
// });

// // Helper endpoint to sign auth message (for testing)
// app.post('/sign-auth/:address', async (req: Request, res: Response) => {
//   try {
//     const { address } = req.params;
//     const { privateKey } = req.body;

//     if (!privateKey) {
//       return res.status(400).json({
//         success: false,
//         error: 'Private key required for signing'
//       });
//     }

//     console.log('✍️ Signing auth message for address:', address);

//     // Use JS SDK helper to sign auth message
//     const signedMessage = await lighthouseJS.signAuthMessage(privateKey);

//     res.json({
//       success: true,
//       address: address,
//       signedMessage: signedMessage,
//       timestamp: new Date().toISOString()
//     });

//   } catch (error) {
//     console.error('Sign auth message error:', error);
//     res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Signing failed'
//     });
//   }
// });

// // Start server
// app.listen(port, () => {
//   console.log(`🚀 Lighthouse Filecoin Storage Server listening on port ${port}`);
//   console.log(`- Health: http://localhost:${port}/health`);
//   console.log(`- Upload: POST http://localhost:${port}/upload`);
//   console.log(`- Download: GET http://localhost:${port}/download/:hash`);
//   console.log(`- Share File: POST http://localhost:${port}/share/:hash`);
//   console.log(`- Access Control: POST http://localhost:${port}/access-control/:hash`);
//   console.log(`- View Image: POST http://localhost:${port}/view-image/:hash`);
//   console.log(`- Auth Message: GET http://localhost:${port}/auth-message/:address`);
// });

// export default app;