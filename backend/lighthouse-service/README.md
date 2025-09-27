# Lighthouse Service for Decentralized Storage

A modular service for encrypted file storage and sharing using Lighthouse Protocol and IPFS/Filecoin.

## Features

- **Encrypted File Uploads**: Upload files with client-side encryption
- **Access Control**: Share and revoke access to encrypted files
- **Ownership Verification**: Track file ownership for secure access management
- **File Retrieval**: Download and decrypt files with proper authorization

## Project Structure

```
lighthouse-service/
├── src/
│   ├── controllers/              # Route handlers
│   │   ├── accessController.js   # Sharing, revocation and ownership
│   │   ├── authController.js     # Authentication messages
│   │   ├── fileController.js     # File retrieval and decryption
│   │   └── uploadController.js   # File upload handling
│   │
│   ├── middlewares/              # Express middlewares
│   │   ├── corsMiddleware.js     # CORS configuration
│   │   ├── errorMiddleware.js    # Global error handling
│   │   └── uploadMiddleware.js   # Multer configuration for uploads
│   │
│   ├── services/                 # Business logic
│   │   ├── lighthouseService.js  # Lighthouse SDK wrapper
│   │   ├── ownershipService.js   # File ownership management
│   │   └── storageService.js     # Local file operations
│   │
│   ├── utils/                    # Utility functions
│   │   └── helpers.js            # Common helpers
│   │
│   ├── uploads/                  # Temporary upload directory
│   ├── ownership/                # Ownership record storage
│   └── index.js                  # Entry point
│
└── package.json                  # Dependencies and scripts
```

## API Endpoints

### File Upload
- `POST /upload` - Upload a file (encrypted or public)

### File Access
- `POST /access/share/:hash` - Share file with another wallet
- `POST /access/revoke/:hash` - Revoke shared access
- `POST /access/check-owner/:hash` - Check if wallet owns a file
- `GET /access/owned-files/:publicKey` - List files owned by wallet

### File Operations
- `GET /file/info/:hash` - Get file metadata
- `GET /file/download/:hash` - Download public file
- `POST /file/decrypt/:hash` - Decrypt and download encrypted file
- `POST /file/view/:hash` - View encrypted image

### Authentication
- `GET /auth/message/:address` - Get auth message for signing
- `POST /auth/message` - Get auth message (POST version)

### Health Check
- `GET /health` - Service status

## Setup & Running

1. Install dependencies:
   ```
   npm install
   ```

2. Set environment variables:
   ```
   LIGHTHOUSE_API_KEY=your_api_key
   PORT=3002 (optional, defaults to 3002)
   ```

3. Start the service:
   ```
   npm start
   ```

4. Development mode:
   ```
   npm run dev
   ```

## Integration

This service is designed as a standalone microservice that can be integrated with any frontend application. The API follows RESTful principles and returns standardized JSON responses.
