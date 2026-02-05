const isProduction = process.env.NODE_ENV === 'production';

export const API_BASE_URL = isProduction 
  ? 'https://pathfinder-api-9nfq.onrender.com' 
  : 'http://127.0.0.1:5000';