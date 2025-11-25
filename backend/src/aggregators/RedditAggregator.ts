import axios from 'axios';
import { logger } from '../utils/logger';
import prisma from '../utils/db';
import { redis } from '../utils/redis';
import { ArticleIngestionService, articleIngestionService } from '../services/ArticleIngestionService';
import { RateLimitError } from '../services/LLMClassificationService';

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  author: string;
  created_utc: number;
  score: number;
  num_comments: number;
  permalink: string;
}

interface RedditApiPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    author: string;
    created_utc: number;
    score: number;
    num_comments: number;
    permalink: string;
    subreddit: string;
  };
}

interface RedditApiResponse {
  data: {
    children: RedditApiPost[];
  };
}

export class RedditAggregator {
  private readonly subreddits = ['technology'];
  private readonly userAgent = 'IT-News-Bot/1.0';
  private readonly postsPerFetch = 20; // Fixed number of posts to fetch
  private readonly ingestion: ArticleIngestionService;

  constructor(ingestion: ArticleIngestionService = articleIngestionService) {
    this.ingestion = ingestion;
  }

  async fetchPosts(subreddit: string): Promise<RedditPost[]> {
    try {
      logger.info(`Fetching ${this.postsPerFetch} posts from r/${subreddit}`);
      
      // Use Reddit's public JSON API - no authentication required
      const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${this.postsPerFetch}`;
      const response = await axios.get<RedditApiResponse>(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      return response.data.data.children.map((item) => ({
        id: item.data.id,
        title: item.data.title,
        selftext: item.data.selftext || '',
        url: item.data.url,
        author: item.data.author || 'deleted',
        created_utc: item.data.created_utc,
        score: item.data.score,
        num_comments: item.data.num_comments,
        permalink: `https://reddit.com${item.data.permalink}`,
      }));
    } catch (error) {
      logger.error(`Error fetching from r/${subreddit}:`, error);
      // Return empty array instead of throwing to allow other subreddits to continue
      return [];
    }
  }

  async aggregateAndStore(): Promise<number> {
    let storedCount = 0;

    for (const subreddit of this.subreddits) {
      try {
        const posts = await this.fetchPosts(subreddit);
        
        for (const post of posts) {
          const stored = await this.storePost(post, subreddit);
          if (stored) storedCount++;
        }
        
        logger.info(`Processed ${posts.length} posts from r/${subreddit}, stored ${storedCount} new articles`);
      } catch (error) {
        // Re-throw RateLimitError - queue will handle retry
        if (error instanceof RateLimitError) {
          throw error;
        }
        logger.error(`Failed to aggregate from r/${subreddit}:`, error);
      }
    }

    return storedCount;
  }

  private async storePost(post: RedditPost, subreddit: string): Promise<boolean> {
    // Check if already processed using Redis
    const cacheKey = `seen:reddit:${post.id}`;
    
    try {
      const exists = await redis.get(cacheKey);
      
      if (exists) {
        logger.debug(`Post ${post.id} already processed`);
        return false;
      }

      // Check if article already exists in DB
      const existingArticle = await prisma.article.findFirst({
        where: { 
          source: 'reddit',
          sourceId: post.id 
        },
      });

      if (existingArticle) {
        await redis.setex(cacheKey, 86400 * 7, '1'); // Cache for 7 days
        return false;
      }

      // Extract content - prefer selftext for self posts, otherwise use title
      const content = post.selftext || post.title;
      const isExternalLink = !post.url.includes('reddit.com');

      await this.ingestion.ingestArticle({
        title: post.title,
        content,
        summary: content.length > 500 ? `${content.substring(0, 497)}...` : content,
        url: post.permalink,
        source: 'reddit',
        sourceId: post.id,
        author: post.author,
        publishedAt: new Date(post.created_utc * 1000),
        metadata: {
          subreddit,
          score: post.score,
          num_comments: post.num_comments,
          external_url: isExternalLink ? post.url : null,
        },
      });

      // Mark as seen
      await redis.setex(cacheKey, 86400 * 7, '1');
      
      logger.info(`Stored new article from r/${subreddit}: ${post.title.substring(0, 50)}...`);
      return true;
    } catch (error) {
      // Re-throw RateLimitError - queue will handle retry
      if (error instanceof RateLimitError) {
        throw error;
      }
      
      // Handle duplicate URL (race condition between check and insert)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        await redis.setex(cacheKey, 86400 * 7, '1');
        logger.debug(`Article already exists: ${post.id}`);
        return false;
      }

      logger.error(`Error storing post ${post.id}:`, error);
      return false;
    }
  }
}
