import multer from 'multer';

// Configure Multer for file uploads
// Store files in memory as Buffer objects
const storage = multer.memoryStorage();

// Create the multer instance with configuration
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
  }
});

export default upload;
