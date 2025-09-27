#!/usr/bin/env node

/**
 * Utility to extract CIDs from Lighthouse API responses and errors
 * This script helps debug and extract CIDs when they're not properly returned
 */

const fs = require('fs');
const path = require('path');

// Check for input file
const inputFile = process.argv[2];
if (!inputFile) {
  console.error('❌ Please provide a log file to parse: node extract-cid.js <logfile>');
  process.exit(1);
}

// Read the file
try {
  const content = fs.readFileSync(inputFile, 'utf8');
  console.log(`📄 Reading file: ${inputFile} (${content.length} bytes)`);
  
  // Find all potential CIDs in the file
  // Filecoin/IPFS CID v1 usually starts with 'baf...'
  // Lighthouse encrypted files typically have CIDs starting with 'bafkrei...'
  const cidRegex = /bafkrei[a-zA-Z0-9]{40,}/g;
  const matches = content.match(cidRegex) || [];
  
  if (matches.length === 0) {
    console.log('⚠️ No Lighthouse CIDs found in the file.');
    
    // Try with a more general regex for any IPFS CID
    const generalCidRegex = /baf[a-zA-Z0-9]{40,}/g;
    const generalMatches = content.match(generalCidRegex) || [];
    
    if (generalMatches.length > 0) {
      console.log(`✅ Found ${generalMatches.length} general IPFS CIDs:`);
      generalMatches.forEach((cid, index) => {
        console.log(`${index + 1}. ${cid}`);
      });
    } else {
      console.log('❌ No CIDs found at all.');
    }
    
  } else {
    console.log(`✅ Found ${matches.length} Lighthouse CIDs:`);
    matches.forEach((cid, index) => {
      console.log(`${index + 1}. ${cid}`);
    });
    
    // Print gateway URLs for the first CID
    if (matches.length > 0) {
      const firstCid = matches[0];
      console.log('\n📋 Access URLs for first CID:');
      console.log(`🔗 Gateway: https://gateway.lighthouse.storage/ipfs/${firstCid}`);
      console.log(`🔒 Decrypt: https://decrypt.mesh3.network/evm/${firstCid}`);
    }
  }
  
} catch (error) {
  console.error('❌ Error reading file:', error.message);
  process.exit(1);
}


