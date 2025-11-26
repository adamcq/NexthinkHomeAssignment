# IT Newsfeed System

Real-time news aggregation, LLM-based classification, and semantic search API for IT-related content.

**Live Demo:** https://newsfeed-frontend.onrender.com

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example backend/.env
# Edit backend/.env with your API keys (Gemini)

# 3. Set up database
docker-compose up -d

# 4 Run database migrations
cd backend
npx prisma migrate dev --name init
cd ..

# 5. Start both backend and frontend
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Swagger Docs: http://localhost:3000/api-docs

## Architecture Overview

### Data Ingestion
1. **Scheduler** triggers aggregation every N minutes (configurable)
2. **Aggregators** fetch from:
   - Reddit (r/technology)
   - RSS feeds (TechCrunch, Ars Technica)
3. **ArticleIngestionService** stores articles with `PENDING` status
4. Articles are immediately queued for classification

### Classification
1. **Classification Queue** (Bull + Redis) processes articles asynchronously
2. **LLMClassificationService** uses Gemini 2.5 Flash to classify into the 6 categories
    - a structured response is required with the following format:
    ```json
    {
        "category": "CYBERSECURITY",
        "categoryScore": 0.95,
        "classificationStatus": "COMPLETED"
    }
    ```
3. Rate limiting handled with automatic retry delays (Free Tier was used during the development with a limit of 10 requests per minute - rate limits in production would likely be more generous)
4. Status updated to `COMPLETED` or `FAILED`

### Search API
- **POST /api/articles/search** - Hybrid search (keyword for match + semantic for ranking)
- **GET /api/articles/:id** - Retrieve specific article
- **GET /api/articles** - List articles with filters
- **POST /api/articles/stats/categories** - Filtered category statistics

**Search Features:**
- Full-text search with PostgreSQL
- Semantic search using pgvector embeddings
- Filter by category (could be easily extended to other filters)
- Pagination support (in the frontend)

## Monitoring

### Redis
The Redis CLI can be accessed with the following command:
```bash
docker exec -it $(docker ps --filter "name=redis" --format "{{.ID}}") redis-cli
```
You can view the cached results

### View Logs
- Application logs: Console output with Winston logger
- Queue events: Job completion, failures, rate limits
- Classification results: Category assignments with confidence scores

## Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Tech Stack

**Backend:** Node.js, TypeScript, Express, Prisma, PostgreSQL, pgvector, Bull, Redis  
**Frontend:** React, TypeScript, Vite, TailwindCSS, TanStack Query  
**LLM:** 
- @google/genai (npm package)
- Classification: Google Gemini 2.5 Flash
- Embeddings: Google text-embedding-004
**Deployment:** Render (production)

## API Documentation

Full interactive API documentation available at `/api-docs` (Swagger UI).

# Assumptions & Discussion
- One class per article - I am letting the LLM return multiple classes with confidence percentages and store all with confidence above 60% in the metadata, but I only expose the highest confidence class to the API
- RSS feed contains enough information to classify the article (otherwise scraping would be required and I am not sure of the legal implications so I did not implement it)
- I am assuming an upper bound on the number of articles to be ingested - it could happen that some articles are not ingested if we fetch too little (this could be fixed by increasingly fetching more until we fetch an article/reddit post that was ingested or has a lower timestamp)
- The ingestion is done immediately and the classification is done asynchronously - this means there is a short period when the article is stored but not yet classified - I did it this way to keep the code modular and to avoid blocking the ingestion process
- Monitoring could be done with more robust tools, but logging was the quickest to implement and helped while developing
- About design decisions: I use Redis for caching to prevent redundant database lookups, I only classify articles after ingestion (one LLM call per article)
- Search assumption: I assume that the other AI applications could use the REST API to search for articles 
