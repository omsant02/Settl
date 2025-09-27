import cors from 'cors';

// Configure CORS for all routes
const corsOptions = {
  origin: '*', // In production, you should restrict this to specific origins
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

export default cors(corsOptions);
