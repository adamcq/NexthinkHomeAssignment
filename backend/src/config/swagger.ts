import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'IT Newsfeed API',
            version: '1.0.0',
            description: 'API for aggregating and classifying IT news articles from multiple sources (Reddit, ArsTechnica, TechCrunch). Articles are ingested and then asynchronously classified using LLM.',
            contact: {
                name: 'API Support',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        components: {
            schemas: {
                Article: {
                    type: 'object',
                    required: ['id', 'title', 'url', 'source', 'publishedAt', 'classificationStatus'],
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Unique article identifier',
                            example: 'cm3x1y2z3a4b5c6d7e8f9g0h'
                        },
                        title: {
                            type: 'string',
                            description: 'Article title',
                            example: 'New AI Model Achieves Breakthrough in Natural Language Processing'
                        },
                        content: {
                            type: 'string',
                            description: 'Full article content',
                            example: 'Researchers have developed a new AI model that...'
                        },
                        summary: {
                            type: 'string',
                            nullable: true,
                            description: 'Article summary or excerpt',
                            example: 'A brief overview of the breakthrough...'
                        },
                        url: {
                            type: 'string',
                            format: 'uri',
                            description: 'Original article URL',
                            example: 'https://techcrunch.com/2024/01/15/ai-breakthrough'
                        },
                        source: {
                            type: 'string',
                            enum: ['reddit', 'arstechnica', 'techcrunch'],
                            description: 'Source of the article',
                            example: 'techcrunch'
                        },
                        sourceId: {
                            type: 'string',
                            description: 'Original identifier from source',
                            example: 'abc123def456'
                        },
                        author: {
                            type: 'string',
                            nullable: true,
                            description: 'Article author',
                            example: 'John Doe'
                        },
                        publishedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Publication timestamp',
                            example: '2024-01-15T10:30:00Z'
                        },
                        category: {
                            type: 'string',
                            nullable: true,
                            enum: ['CYBERSECURITY', 'AI_EMERGING_TECH', 'SOFTWARE_DEVELOPMENT', 'HARDWARE_DEVICES', 'TECH_INDUSTRY_BUSINESS', 'OTHER'],
                            description: 'Classified category (null if not yet classified)',
                            example: 'AI_EMERGING_TECH'
                        },
                        categoryScore: {
                            type: 'number',
                            nullable: true,
                            minimum: 0,
                            maximum: 1,
                            description: 'Classification confidence score',
                            example: 0.95
                        },
                        classificationStatus: {
                            type: 'string',
                            enum: ['PENDING', 'COMPLETED', 'FAILED'],
                            description: 'Classification processing status',
                            example: 'COMPLETED'
                        },
                        metadata: {
                            type: 'object',
                            nullable: true,
                            description: 'Additional metadata from source and classification',
                            example: {
                                type: 'rss',
                                source: 'techcrunch',
                                classifiedAt: '2024-01-15T10:35:00Z'
                            }
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Record creation timestamp',
                            example: '2024-01-15T10:30:00Z'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Record last update timestamp',
                            example: '2024-01-15T10:35:00Z'
                        }
                    },
                },
                SearchRequest: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query for semantic/keyword search',
                            example: 'artificial intelligence machine learning'
                        },
                        category: {
                            type: 'string',
                            enum: ['CYBERSECURITY', 'AI_EMERGING_TECH', 'SOFTWARE_DEVELOPMENT', 'HARDWARE_DEVICES', 'TECH_INDUSTRY_BUSINESS', 'OTHER'],
                            description: 'Filter by category',
                            example: 'AI_EMERGING_TECH'
                        },
                        source: {
                            type: 'string',
                            enum: ['reddit', 'arstechnica', 'techcrunch'],
                            description: 'Filter by source',
                            example: 'techcrunch'
                        },
                        startDate: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Filter articles published after this date',
                            example: '2024-01-01T00:00:00Z'
                        },
                        endDate: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Filter articles published before this date',
                            example: '2024-01-31T23:59:59Z'
                        },
                        limit: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 100,
                            default: 20,
                            description: 'Number of results to return',
                            example: 20
                        },
                        offset: {
                            type: 'integer',
                            minimum: 0,
                            default: 0,
                            description: 'Number of results to skip (for pagination)',
                            example: 0
                        }
                    }
                },
                SearchResponse: {
                    type: 'object',
                    required: ['articles', 'total', 'limit', 'offset'],
                    properties: {
                        articles: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Article' },
                            description: 'Array of matching articles'
                        },
                        total: {
                            type: 'integer',
                            description: 'Total number of matching articles',
                            example: 150
                        },
                        limit: {
                            type: 'integer',
                            description: 'Requested limit',
                            example: 20
                        },
                        offset: {
                            type: 'integer',
                            description: 'Requested offset',
                            example: 0
                        }
                    }
                },
                ListResponse: {
                    type: 'object',
                    required: ['articles', 'total', 'limit', 'offset'],
                    properties: {
                        articles: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Article' },
                            description: 'Array of articles'
                        },
                        total: {
                            type: 'integer',
                            description: 'Total number of articles matching filters',
                            example: 500
                        },
                        limit: {
                            type: 'integer',
                            description: 'Requested limit',
                            example: 20
                        },
                        offset: {
                            type: 'integer',
                            description: 'Requested offset',
                            example: 0
                        }
                    }
                },
                CategoryStats: {
                    type: 'object',
                    properties: {
                        category: {
                            type: 'string',
                            enum: ['CYBERSECURITY', 'AI_EMERGING_TECH', 'SOFTWARE_DEVELOPMENT', 'HARDWARE_DEVICES', 'TECH_INDUSTRY_BUSINESS', 'OTHER'],
                            description: 'Category name',
                            example: 'AI_EMERGING_TECH'
                        },
                        count: {
                            type: 'integer',
                            description: 'Number of articles in this category',
                            example: 150
                        }
                    }
                },
                Error: {
                    type: 'object',
                    required: ['error'],
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message',
                            example: 'Invalid request parameters'
                        },
                        details: {
                            type: 'array',
                            items: { type: 'object' },
                            description: 'Detailed validation errors (if applicable)'
                        }
                    }
                }
            },
        },
        tags: [
            {
                name: 'Articles',
                description: 'Article search, retrieval, and statistics endpoints'
            }
        ]
    },
    apis: ['./src/api/routes/*.ts'], // Path to the API docs
};

export const specs = swaggerJsdoc(options);
