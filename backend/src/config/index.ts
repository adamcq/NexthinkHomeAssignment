import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL!,
  },
  
  redis: {
    url: process.env.REDIS_URL!,
  },
  
  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: 'gemini-2.5-flash',
    embeddingModel: 'text-embedding-004',
  },
  
  // Reddit configuration - using public JSON API (no credentials needed)
  reddit: {
    userAgent: process.env.REDDIT_USER_AGENT || 'IT-News-Bot/1.0',
  },
  
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  },
  
  fetching: {
    intervalMinutes: parseInt(process.env.FETCH_INTERVAL_MINUTES || '3', 10),
    articlesRetentionDays: parseInt(process.env.ARTICLES_RETENTION_DAYS || '30', 10),
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'GEMINI_API_KEY',
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  if (process.env.NODE_ENV === 'production') { // TODO remove this condition
    process.exit(1);
  }
}
