# Lighthouse + Filecoin Storage Service

A standalone service for uploading and retrieving files using Lighthouse and Filecoin.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your Lighthouse API key
   ```

3. **Build and run:**
   ```bash
   npm run build
   npm start
   ```

   Or for development:
   ```bash
   npm run dev
   ```

## Environment Variables

```env
LIGHTHOUSE_API_KEY=your_lighthouse_api_key_here
PORT=3002
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## API Endpoints

### Upload File
```bash
POST /upload
Content-Type: multipart/form-data

# Response:
{
  "success": true,
  "hash": "QmX...",
  "filename": "file.jpg",
  "size": 12345,
  "ipfs_url": "ipfs://QmX...",
  "gateway_url": "https://gateway.lighthouse.storage/ipfs/QmX..."
}
```

### Get File Info
```bash
GET /file/:hash

# Response:
{
  "success": true,
  "hash": "QmX...",
  "gateway_url": "https://gateway.lighthouse.storage/ipfs/QmX...",
  "ipfs_url": "ipfs://QmX..."
}
```

### Download File
```bash
GET /download/:hash
# Returns the file content directly
```

### Health Check
```bash
GET /health

# Response:
{
  "status": "ok",
  "service": "Lighthouse Filecoin Storage",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Integration

This service can be integrated into any project by:

1. Running the standalone server
2. Making HTTP requests to the API endpoints
3. Using the provided TypeScript classes directly

## Features

- ✅ File upload to Lighthouse/Filecoin
- ✅ File retrieval via IPFS gateway
- ✅ File download proxy
- ✅ CORS support for web applications
- ✅ TypeScript support
- ✅ Express.js REST API
- ✅ Easy integration with any project

## File Size Limits

- Maximum file size: 50MB
- Supported file types: All

## Technology Stack

- **Storage**: Lighthouse + Filecoin
- **Backend**: Node.js + Express + TypeScript
- **File Handling**: Multer
- **IPFS Gateway**: Lighthouse Gateway