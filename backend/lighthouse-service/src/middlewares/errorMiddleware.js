/**
 * Global error handling middleware
 * This middleware catches any errors thrown in the application
 * and returns a standardized error response
 */
const errorMiddleware = (err, req, res, next) => {
  console.error('❌ Error caught by middleware:', err);
  
  // Set status code
  const statusCode = err.statusCode || 500;
  
  // Create response object
  const errorResponse = {
    success: false,
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  };
  
  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }
  
  // Send response
  res.status(statusCode).json(errorResponse);
};

export default errorMiddleware;
