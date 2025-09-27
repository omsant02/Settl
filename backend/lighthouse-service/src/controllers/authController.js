import express from 'express';
import lighthouseService from '../services/lighthouseService.js';
import { createResponse, createError } from '../utils/helpers.js';

const router = express.Router();

/**
 * Get auth message for signing
 * GET /auth/message/:address
 */
router.get('/message/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      throw createError('Address is required', 400);
    }
    
    console.log('📋 Getting auth message for:', address);
    const authMessage = await lighthouseService.getAuthMessage(address);
    
    if (!authMessage || !authMessage.data || !authMessage.data.message) {
      throw createError('Failed to get auth message', 500);
    }
    
    const message = authMessage.data.message;
    console.log('✅ Auth message retrieved:', message);
    
    res.json({
      success: true,
      message: message,
      data: authMessage.data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Get auth message for signing (POST version for compatibility)
 * POST /auth/message
 */
router.post('/message', async (req, res, next) => {
  try {
    const { publicKey } = req.body;
    
    if (!publicKey) {
      throw createError('Public key is required', 400);
    }
    
    console.log('📋 Getting auth message for:', publicKey);
    const authMessage = await lighthouseService.getAuthMessage(publicKey);
    
    if (!authMessage || !authMessage.data || !authMessage.data.message) {
      throw createError('Failed to get auth message', 500);
    }
    
    const message = authMessage.data.message;
    console.log('✅ Auth message retrieved:', message);
    
    res.json({
      success: true,
      message: message,
      data: authMessage.data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    next(error);
  }
});

export default router;
