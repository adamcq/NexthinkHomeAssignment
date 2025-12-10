import Parser from 'rss-parser';
import axios from 'axios'; // Used for potential future enhancements
import { htmlToText } from 'html-to-text';
import { logger } from '../utils/logger';
import prisma from '../utils/db';
import { redis } from '../utils/redis';
import crypto from 'crypto';
import { ArticleIngestionService, articleIngestionService } from '../services/ArticleIngestionService';
import { RateLimitError } from '../services/LLMClassificationService';
import { RSSMetadata } from '../types/metadata';

export interface RSSFeed {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  author?: string;
  categories?: string[];
}

export class RSSAggregator {
  private parser: Parser;
  private feeds = [
    {
      name: 'arstechnica',
      url: 'https://feeds.arstechnica.com/arstechnica/index', // TODO or https://feeds.arstechnica.com/arstechnica/technology-lab
    },
    {
      name: 'techcrunch',
      url: 'https://techcrunch.com/feed/',
    },
  ];

  private readonly ingestion: ArticleIngestionService;

  constructor(ingestion: ArticleIngestionService = articleIngestionService) {
    this.ingestion = ingestion;
    this.parser = new Parser({
      timeout: 10000,
      customFields: {
        item: ['content:encoded', 'content'],
      },
    });
  }

  async fetchFeed(feedUrl: string): Promise<RSSFeed[]> {
    try {
      logger.info(`Fetching RSS feed: ${feedUrl}`);

      const feed = await this.parser.parseURL(feedUrl);

      return feed.items.map((item) => ({
        title: item.title || 'Untitled',
        link: item.link || '',
        description: item.description,
        pubDate: item.pubDate,
        content: (item as any)['content:encoded'] || item.content || item.contentSnippet,
        contentSnippet: item.contentSnippet,
        author: item.creator || item.author,
        categories: this.extractCategories(item as Record<string, unknown>),
      }));
    } catch (error) {
      logger.error(`Error fetching RSS feed ${feedUrl}:`, error);
      throw error;
    }
  }

  private async processFeeds(): Promise<{ storedItems: RSSFeed[]; storedCount: number }> {
    const storedItems: RSSFeed[] = [];
    let storedCount = 0;

    for (const feed of this.feeds) {
      try {
        const items = await this.fetchFeed(feed.url);

        for (const item of items) {
          const stored = await this.storeFeedItem(item, feed.name);
          if (stored) {
            storedItems.push(item);
            storedCount++;
          }
        }

        logger.info(`Processed ${items.length} items from ${feed.name}, stored ${storedCount} new articles`);
      } catch (error) {
        // Re-throw RateLimitError - queue will handle retry
        if (error instanceof RateLimitError) {
          throw error;
        }
        logger.error(`Failed to aggregate from ${feed.name}:`, error);
      }
    }

    return { storedItems, storedCount };
  }

  async aggregateAndStore(): Promise<number> {
    const { storedCount } = await this.processFeeds();
    return storedCount;
  }

  // Backwards-compatible alias expected by existing tests
  async aggregate(): Promise<RSSFeed[]> {
    const { storedItems } = await this.processFeeds();
    return storedItems;
  }

  private async storeFeedItem(item: RSSFeed, source: string): Promise<boolean> {
    // Use the raw link as the cache key
    const cacheKey = `seen:${source}:${item.link}`;

    try {
      if (!item.link) {
        logger.warn('Feed item missing link, skipping');
        return false;
      }

      // Check if already processed
      const exists = await redis.get(cacheKey);
      if (exists) {
        logger.debug(`Item ${item.link} already processed`);
        return false;
      }

      // Check database for duplicate URL
      const existingArticle = await prisma.article.findUnique({
        where: { url: item.link },
      });

      if (existingArticle) {
        await redis.setex(cacheKey, 86400 * 7, '1');
        return false;
      }

      // Clean HTML from content
      const rawContent = item.content || item.description || '';
      const content = this.cleanHtml(rawContent);
      const summarySource = item.contentSnippet || item.description || rawContent;
      const summary = this.cleanHtml(summarySource).substring(0, 500);

      // Parse date
      const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();

      const sourceFeed = this.feeds.find(f => f.name === source)?.url;
      const metadata: RSSMetadata = {
        type: 'rss',
        feedUrl: sourceFeed,
        source,
        rssCategories: item.categories?.length ? item.categories : undefined,
        author: item.author,
      };

      await this.ingestion.ingestArticle({
        title: item.title,
        content,
        summary,
        url: item.link,
        source,
        sourceId: crypto.createHash('md5').update(item.link).digest('hex'),
        author: item.author || null,
        publishedAt,
        metadata,
      });

      // Mark as seen
      await redis.setex(cacheKey, 86400 * 7, '1');

      logger.info(`Stored new article from ${source}: ${item.title.substring(0, 50)}...`);
      return true;
    } catch (error) {
      // Re-throw RateLimitError - queue will handle retry
      if (error instanceof RateLimitError) {
        throw error;
      }

      // Handle duplicate URL (race condition between check and insert)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        await redis.setex(cacheKey, 86400 * 7, '1');
        logger.debug(`Article already exists: ${item.link}`);
        return false;
      }

      logger.error(`Error storing feed item ${item.link}:`, error);
      return false;
    }
  }

  private cleanHtml(html: string): string {
    if (!html) {
      return '';
    }

    const text = htmlToText(html, {
      wordwrap: false,
      selectors: [
        { selector: 'img', format: 'skip' },
        { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
      ],
    });

    return text.replace(/\s+/g, ' ').trim();
  }

  private extractCategories(item: Record<string, unknown>): string[] {
    const rawCategories = (item.categories as unknown) || [];
    if (!Array.isArray(rawCategories)) {
      return [];
    }

    return rawCategories
      .map((category) => {
        if (typeof category === 'string') {
          return category;
        }

        if (typeof category === 'object' && category !== null) {
          if ('_' in category && typeof (category as any)._ === 'string') {
            return (category as any)._ as string;
          }
          if ('$' in category && typeof (category as any).$?.text === 'string') {
            return (category as any).$?.text as string;
          }
        }

        return null;
      })
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim())
      .filter(Boolean);
  }
}
