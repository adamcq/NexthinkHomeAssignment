import { GoogleGenAI } from '@google/genai';
import { config } from './config';
import { logger } from './utils/logger';

/**
 * Test script for @google/genai package
 * Tests embeddings and classification with sample payloads
 */

const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });

async function testEmbeddings() {
  console.log('\n=== Testing Embeddings ===\n');
  
  const sampleText = `Momentic raises $15M to automate software testing

AI testing startup Momentic has raised $15 million in a Series A round led by Standard Capital, with participation from Dropbox Ventures. Existing investors at Y Combinator, FCVC, Transpose Platform and Karman Ventures also participated.`;

  try {
    console.log('Sample text:', sampleText);
    console.log('\nGenerating embedding...');
    
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: sampleText,
    });
    
    console.log('\n✓ Embedding generated successfully!');
    console.log('Number of embeddings:', response.embeddings?.length);
    console.log('Embedding dimension:', response.embeddings?.[0]?.values?.length);
    console.log('First 10 values:', response.embeddings?.[0]?.values?.slice(0, 10));
    
    return response.embeddings?.[0]?.values || [];
  } catch (error) {
    console.error('\n✗ Embedding generation failed:', error);
    throw error;
  }
}

async function testClassification() {
  console.log('\n=== Testing Classification ===\n');
  
  const title = 'Momentic raises $15M to automate software testing';
  const content = `AI testing startup Momentic has raised $15 million in a Series A round led by Standard Capital, with participation from Dropbox Ventures. Existing investors at Y Combinator, FCVC, Transpose Platform and Karman Ventures also participated.`;
  const rssCategories = ['AI', 'Y Combinator'];

  const systemPrompt = `You are an IT news classifier. Analyze the provided title and content, then rank the categories below. Always respond with structured JSON that follows the provided schema. Categories:

1. CYBERSECURITY - Security breaches, vulnerabilities, privacy, encryption, hacking, data protection
2. AI_EMERGING_TECH - Artificial Intelligence, Machine Learning, quantum computing, blockchain, AR/VR, emerging technologies
3. SOFTWARE_DEVELOPMENT - Programming languages, frameworks, DevOps, open source, software engineering, development tools
4. HARDWARE_DEVICES - CPUs, GPUs, smartphones, IoT devices, consumer electronics, computer hardware
5. TECH_INDUSTRY_BUSINESS - Company news, acquisitions, stock market, regulations, tech industry business
6. OTHER - General tech news that doesn't fit the above categories

Return the best-fitting category as the primary entry along with optional secondary candidates.`;

  const userPrompt = `Classify the following IT news article:

Title: ${title}

Content: ${content}

Source categories (from RSS): ${rssCategories.join(', ')}

Use the source categories only as a hint if they are helpful and consistent with the content. Provide your classification in JSON format.`;

  try {
    console.log('Title:', title);
    console.log('Content:', content.substring(0, 100) + '...');
    console.log('RSS Categories:', rssCategories);
    console.log('\nGenerating classification...');
    
    // Using generateContent with JSON schema for structured output
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            categories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: {
                    type: 'string',
                    enum: [
                      'CYBERSECURITY',
                      'AI_EMERGING_TECH',
                      'SOFTWARE_DEVELOPMENT',
                      'HARDWARE_DEVICES',
                      'TECH_INDUSTRY_BUSINESS',
                      'OTHER',
                    ],
                  },
                  confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                  },
                  reasoning: {
                    type: 'string',
                  },
                },
                required: ['category', 'confidence'],
              },
            },
          },
          required: ['categories'],
        },
      },
    });
    
    const responseText = response.text;
    console.log('\n✓ Classification generated successfully!');
    console.log('Raw response:', responseText);
    
    const parsed = JSON.parse(responseText);
    console.log('\nParsed classification:');
    console.log(JSON.stringify(parsed, null, 2));
    
    return parsed;
  } catch (error) {
    console.error('\n✗ Classification failed:', error);
    throw error;
  }
}

async function main() {
  console.log('Starting @google/genai tests...\n');
  console.log('API Key:', config.gemini.apiKey ? '✓ Set' : '✗ Missing');
  
  try {
    // Test embeddings
    await testEmbeddings();
    
    // Test classification
    await testClassification();
    
    console.log('\n=== All tests passed! ===\n');
  } catch (error) {
    console.error('\n=== Tests failed ===\n', error);
    process.exit(1);
  }
}

main();
