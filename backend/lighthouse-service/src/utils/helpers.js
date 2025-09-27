/**
 * Format file size in bytes to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
    return 'Unknown Size';
  }
  
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

/**
 * Detect MIME type from file content
 * @param {Buffer} buffer - File buffer
 * @param {string} defaultType - Default MIME type to use if detection fails
 * @returns {string} Detected MIME type
 */
export function detectMimeType(buffer, defaultType = 'application/octet-stream') {
  try {
    if (!buffer || buffer.length < 4) {
      return defaultType;
    }
    
    // Check for common image formats based on magic bytes
    const header = buffer.slice(0, 4);
    
    // JPEG: FF D8 FF
    if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
      return 'image/jpeg';
    }
    
    // PNG: 89 50 4E 47
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
      return 'image/png';
    }
    
    // GIF: 47 49 46
    if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
      return 'image/gif';
    }
    
    // WEBP: 52 49 46 46
    if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
      return 'image/webp';
    }
    
    // PDF: 25 50 44 46
    if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
      return 'application/pdf';
    }
    
    return defaultType;
  } catch (error) {
    console.error('❌ Error detecting MIME type:', error);
    return defaultType;
  }
}

/**
 * Create a standardized response object
 * @param {boolean} success - Success status
 * @param {object} data - Response data
 * @param {string} message - Response message
 * @param {number} statusCode - HTTP status code
 * @returns {object} Standardized response object
 */
export function createResponse(success, data = null, message = null, statusCode = 200) {
  const response = {
    success,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  if (message !== null) {
    response.message = message;
  }
  
  // Add status code for HTTP responses
  response.statusCode = statusCode;
  
  return response;
}

/**
 * Create an error object with status code
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Error} Error object with statusCode property
 */
export function createError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
