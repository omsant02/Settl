import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const baseDir = path.join(dirname(__dirname)); // Go up one level to src

/**
 * StorageService - Handle local file operations
 */
class StorageService {
  /**
   * Create a temporary file from a buffer
   * @param {Buffer} fileBuffer - The file buffer
   * @param {string} fileName - Original file name
   * @returns {string} Path to the created temporary file
   */
  createTempFile(fileBuffer, fileName) {
    try {
      // Create hash of file buffer for unique name
      const fileHash = crypto.createHash('md5').update(fileBuffer).digest('hex');
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(baseDir, 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('📁 Created uploads directory:', uploadsDir);
      }
      
      // Create file path
      const filePath = path.join(uploadsDir, `${fileHash}-${fileName}`);
      console.log('📁 Using local file path:', filePath);
      
      // Write buffer to file
      fs.writeFileSync(filePath, fileBuffer);
      console.log('✅ Successfully wrote data to file');
      
      // Verify file size
      const stats = fs.statSync(filePath);
      if (stats.size !== fileBuffer.length) {
        console.warn('⚠️ Warning: File size mismatch after write');
        console.warn(`   Expected: ${fileBuffer.length} bytes, Actual: ${stats.size} bytes`);
      } else {
        console.log('✓ File size verified:', stats.size, 'bytes');
      }
      
      return filePath;
    } catch (error) {
      console.error('❌ Failed to create temporary file:', error);
      throw error;
    }
  }
  
  /**
   * Delete a file
   * @param {string} filePath - Path to the file to delete
   */
  deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ File deleted:', filePath);
      }
    } catch (error) {
      console.error('❌ Failed to delete file:', error);
      // Don't throw here, just log the error
    }
  }
  
  /**
   * Read a file
   * @param {string} filePath - Path to the file to read
   * @returns {Buffer} File contents as buffer
   */
  readFile(filePath) {
    try {
      return fs.readFileSync(filePath);
    } catch (error) {
      console.error('❌ Failed to read file:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export default new StorageService();
