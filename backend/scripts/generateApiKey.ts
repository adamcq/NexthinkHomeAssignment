#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function generateApiKey(name: string, description?: string) {
  const key = crypto.randomBytes(32).toString('hex');
  
  const apiKey = await prisma.apiKey.create({
    data: {
      key,
      name,
      description: description || `API key for ${name}`,
      isActive: true,
    },
  });
  
  console.log('\n✅ API Key generated successfully!\n');
  console.log('Key ID:', apiKey.id);
  console.log('Name:', apiKey.name);
  console.log('API Key:', apiKey.key);
  console.log('\n⚠️  Save this key securely - it won\'t be shown again!\n');
  console.log('Usage: Include this key in your request headers:');
  console.log('  x-api-key:', apiKey.key);
  console.log('');
  
  return apiKey;
}

const name = process.argv[2];
const description = process.argv[3];

if (!name) {
  console.log('Usage: ts-node scripts/generateApiKey.ts <name> [description]');
  console.log('Example: ts-node scripts/generateApiKey.ts "My App" "API key for my application"');
  process.exit(1);
}

generateApiKey(name, description)
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('Error generating API key:', error);
    prisma.$disconnect();
    process.exit(1);
  });
