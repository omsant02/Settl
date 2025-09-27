/**
 * Standalone Filecoin Service for SplitwiseX
 * 
 * This Express server exposes API endpoints that interact with the Filecoin network
 * using Synapse SDK. It handles WebSocket connections and provides a clean HTTP API
 * for the Next.js frontend.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from 'dotenv';
import {
  ReceiptStorage,
  ReceiptMetadata,
  ReceiptStorageResult
} from './synapse/ReceiptStorage.js';

// Load environment variables
config();

const app = express();
const port = process.env.PORT || 3001;

// Define interface for error handling
interface ErrorWithMessage extends Error {
  message: string;
}

// Request interface for file uploads
interface UploadRequest extends Request {
  body: {
    fileData: string;
    metadata?: ReceiptMetadata;
  }
}

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));  // Support larger file uploads
app.use(express.urlencoded({ extended: true }));

// Global error handler
app.use((err: ErrorWithMessage, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: err.message || 'Internal server error'
  });
});

// Global storage instance
let storageInstance: ReceiptStorage | null = null;

// Initialize storage on server start
async function initializeServer(): Promise<void> {
  try {
    console.log('🚀 Initializing Filecoin service with Synapse SDK...');
    
    if (!process.env.COMPANY_PRIVATE_KEY) {
      throw new Error('COMPANY_PRIVATE_KEY environment variable not found');
    }
    
    storageInstance = new ReceiptStorage();
    await storageInstance.initialize();
    console.log('✅ Synapse SDK initialized successfully');
    
    // Check balance
    const balance = await storageInstance.checkBalance();
    console.log(`💰 Current USDFC balance: ${balance}`);
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Ensure storage instance is available
function getStorage(): ReceiptStorage {
  if (!storageInstance) {
    throw new Error('Storage instance not initialized');
  }
  return storageInstance;
}

// API Routes

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'Filecoin Storage Service',
    timestamp: new Date().toISOString()
  });
});

/**
 * Get storage status and balance
 */
app.get('/status', async (_req: Request, res: Response) => {
  try {
    const stats = await getStorage().getStorageStats();
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      ...stats
    });
  } catch (error) {
    const err = error as ErrorWithMessage;
    res.status(500).json({
      status: 'error',
      error: err.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Initialize payment setup (one-time setup)
 */
app.post('/setup', async (_req: Request, res: Response) => {
  try {
    console.log('Setting up Filecoin payments (one-time setup)...');
    await getStorage().setupPayments();
    
    res.json({
      success: true,
      message: 'Payment setup completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const err = error as ErrorWithMessage;
    console.error('Payment setup failed:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Upload receipt to Filecoin
 */
app.post('/upload', async (req: UploadRequest, res: Response) => {
  try {
    const { fileData, metadata } = req.body;
    
    if (!fileData) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file data provided' 
      });
    }
    
    console.log('Uploading receipt to Filecoin:', {
      metadataProvided: !!metadata,
      fileSize: Buffer.from(fileData, 'base64').length
    });
    
    // Convert base64 string to Buffer
    const buffer = Buffer.from(fileData, 'base64');
    
    // Upload to Filecoin
    const result = await getStorage().uploadReceipt(buffer, metadata || {});
    
    if (result.success && result.pieceCid) {
      console.log('Filecoin upload successful:', result);
      
      res.json({
        success: true,
        storageId: `filecoin:${result.pieceCid}`,
        pieceCid: result.pieceCid,
        size: result.size,
        network: 'Filecoin Calibration',
        gatewayUrl: `https://dweb.link/ipfs/${result.pieceCid}`,
        explorerUrl: `https://calibration.filfox.info/en/search/${result.pieceCid}`
      });
    } else {
      console.error('Filecoin upload failed:', result.error);
      res.status(500).json({
        success: false,
        error: result.error || 'Unknown upload error'
      });
    }
  } catch (error) {
    const err = error as ErrorWithMessage;
    console.error('API upload error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Unknown error'
    });
  }
});

/**
 * Download receipt from Filecoin
 */
app.get('/download/:pieceCid', async (req: Request, res: Response) => {
  try {
    const { pieceCid } = req.params;
    
    console.log('Downloading receipt from Filecoin:', pieceCid);
    
    const result = await getStorage().downloadReceipt(pieceCid);
    
    if (result.success && result.data) {
      // Send the file data
      res.set('Content-Type', 'application/octet-stream');
      res.send(Buffer.from(result.data));
    } else {
      console.error('Download failed:', result.error);
      res.status(404).json({
        success: false,
        error: result.error || 'File not found'
      });
    }
  } catch (error) {
    const err = error as ErrorWithMessage;
    console.error('Download error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Unknown error'
    });
  }
});

// Start the server
async function startServer(): Promise<void> {
  await initializeServer();
  
  app.listen(port, () => {
    console.log(`🚀 Filecoin service listening on port ${port}`);
    console.log(`- Health check: http://localhost:${port}/health`);
    console.log(`- Status: http://localhost:${port}/status`);
  });
}

// Only start the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(console.error);
}

// Export the Express app for testing or integration
export default app;
