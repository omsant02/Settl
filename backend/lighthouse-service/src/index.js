import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import middlewares
import corsMiddleware from './middlewares/corsMiddleware.js';
import errorMiddleware from './middlewares/errorMiddleware.js';

// Import controllers
import uploadController from './controllers/uploadController.js';
import fileController from './controllers/fileController.js';
import accessController from './controllers/accessController.js';
import authController from './controllers/authController.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize app
const app = express();
const port = process.env.PORT || 3002;

// Apply global middlewares
app.use(corsMiddleware);
app.use(express.json());

// Create necessary directories
const uploadsDir = path.join(__dirname, 'uploads');
const ownershipDir = path.join(__dirname, 'ownership');

// Ensure directories exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

if (!fs.existsSync(ownershipDir)) {
  fs.mkdirSync(ownershipDir, { recursive: true });
  console.log('📁 Created ownership records directory');
}

// Mount controllers (routes)
app.use('/upload', uploadController);
app.use('/file', fileController);
app.use('/access', accessController);
app.use('/auth', authController);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Lighthouse Filecoin Storage Service',
    timestamp: new Date().toISOString()
  });
});

// Apply error handling middleware
app.use(errorMiddleware);

// Start server
app.listen(port, () => {
  console.log(`🚀 Lighthouse Filecoin Storage Server listening on port ${port}`);
  console.log(`- Health: http://localhost:${port}/health`);
  console.log(`- Upload: POST http://localhost:${port}/upload`);
  console.log(`- File Info: GET http://localhost:${port}/file/info/:hash`);
  console.log(`- Download: GET http://localhost:${port}/file/download/:hash`);
  console.log(`- View Image: POST http://localhost:${port}/file/view/:hash`);
  console.log(`- Share File: POST http://localhost:${port}/access/share/:hash`);
  console.log(`- Revoke Access: POST http://localhost:${port}/access/revoke/:hash`);
  console.log(`- Check Owner: POST http://localhost:${port}/access/check-owner/:hash`);
  console.log(`- Auth Message: GET http://localhost:${port}/auth/message/:address`);
});
