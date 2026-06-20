import env from './env.js';

const DEV_ORIGINS = [
  env.FRONTEND_ORIGIN,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

const PRODUCTION_ORIGINS = [
  env.FRONTEND_ORIGIN,
  'https://storytelling-sepia.vercel.app',
]
  .flatMap((origin) => String(origin || '').split(','))
  .map((origin) => origin.trim())
  .filter(Boolean)
  .filter((origin, index, all) => all.indexOf(origin) === index);

export function getCorsOptions() {
  if (env.isProduction) {
    return {
      origin(origin, callback) {
        if (!origin || PRODUCTION_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS: origin مجاز نیست.'));
        }
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
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
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}

export default getCorsOptions;
