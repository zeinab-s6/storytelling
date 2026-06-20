import env from './env.js';

const DEV_ORIGINS = [
  env.FRONTEND_ORIGIN,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

export function getCorsOptions() {
  if (env.isProduction) {
    return {
      origin: env.FRONTEND_ORIGIN,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
  }

  return {
    origin(origin, callback) {
      if (!origin || DEV_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS: origin مجاز نیست.'));
      }
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}

export default getCorsOptions;
