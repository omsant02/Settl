import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const baseDir = path.join(dirname(__dirname)); // Go up one level to src

/**
 * OwnershipService - Manage file ownership records
 */
class OwnershipService {
  /**
   * Record file ownership
   * @param {string} fileHash - CID of the file
   * @param {string} publicKey - Owner's wallet address
   * @returns {boolean} Success status
   */
  recordOwnership(fileHash, publicKey) {
    try {
      console.log('📝 Recording file ownership for:', publicKey);
      
      if (!fileHash) {
        console.error('❌ Cannot record ownership: No file hash provided');
        return false;
      }
      
      // Create ownership data
      const ownershipData = {
        fileHash: fileHash,
        owner: publicKey.toLowerCase(), // Normalize to lowercase
        timestamp: new Date().toISOString()
      };
      
      // Create ownership records directory if it doesn't exist
      const ownershipDir = path.join(baseDir, 'ownership');
      if (!fs.existsSync(ownershipDir)) {
        fs.mkdirSync(ownershipDir, { recursive: true });
        console.log('📁 Created ownership records directory');
      }
      
      // Save ownership record
      const ownershipPath = path.join(ownershipDir, `${fileHash}.json`);
      fs.writeFileSync(ownershipPath, JSON.stringify(ownershipData, null, 2));
      console.log('✅ Ownership record saved for file:', fileHash);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to record ownership:', error);
      return false;
    }
  }
  
  /**
   * Check if a wallet is the owner of a file
   * @param {string} fileHash - CID of the file
   * @param {string} publicKey - Wallet address to check
   * @returns {boolean|null} true if owner, false if not owner, null if unknown
   */
  checkOwnership(fileHash, publicKey) {
    try {
      console.log('🔍 Checking local ownership record for file:', fileHash);
      
      // Check if ownership record exists
      const ownershipDir = path.join(baseDir, 'ownership');
      const ownershipPath = path.join(ownershipDir, `${fileHash}.json`);
      
      if (!fs.existsSync(ownershipPath)) {
        console.log('⚠️ No local ownership record found');
        return null;
      }
      
      // Read and parse ownership data
      const ownershipData = JSON.parse(fs.readFileSync(ownershipPath, 'utf8'));
      
      // Compare wallet addresses (case-insensitive)
      if (ownershipData.owner && ownershipData.owner.toLowerCase() === publicKey.toLowerCase()) {
        console.log('✅ Local ownership record confirms wallet is owner');
        return true;
      } else {
        console.log('❌ Local ownership record shows different owner');
        console.log(`   Record shows: ${ownershipData.owner}`);
        console.log(`   Current wallet: ${publicKey}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking local ownership record:', error);
      return null;
    }
  }
  
  /**
   * Get all files owned by a wallet
   * @param {string} publicKey - Wallet address
   * @returns {Array} Array of file hashes owned by the wallet
   */
  getOwnedFiles(publicKey) {
    try {
      console.log('🔍 Getting files owned by:', publicKey);
      
      const ownershipDir = path.join(baseDir, 'ownership');
      
      if (!fs.existsSync(ownershipDir)) {
        return [];
      }
      
      // Get all ownership files
      const ownershipFiles = fs.readdirSync(ownershipDir).filter(file => file.endsWith('.json'));
      
      // Check each file for ownership
      const ownedFiles = [];
      for (const file of ownershipFiles) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(ownershipDir, file), 'utf8'));
          
          if (data.owner && data.owner.toLowerCase() === publicKey.toLowerCase()) {
            ownedFiles.push(data.fileHash);
          }
        } catch (error) {
          console.error('❌ Error reading ownership file:', file, error);
        }
      }
      
      return ownedFiles;
    } catch (error) {
      console.error('❌ Error getting owned files:', error);
      return [];
    }
  }
}

// Create and export a singleton instance
export default new OwnershipService();
