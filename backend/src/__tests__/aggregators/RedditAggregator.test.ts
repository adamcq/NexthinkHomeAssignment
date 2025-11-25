import { RedditAggregator } from '../../aggregators/RedditAggregator';
import { db } from '../../utils/db';
import { redis } from '../../utils/redis';
import { ArticleIngestionService } from '../../services/ArticleIngestionService';

jest.mock('../../utils/db');
jest.mock('../../utils/redis');
jest.mock('axios');

describe('RedditAggregator', () => {
  let aggregator: RedditAggregator;
  let mockIngestionService: Pick<ArticleIngestionService, 'ingestArticle'>;

  beforeEach(() => {
    mockIngestionService = {
      ingestArticle: jest.fn().mockResolvedValue({
        article: { id: '1' } as any,
        classification: null,
        embeddingStored: false,
      }),
    };

    aggregator = new RedditAggregator(mockIngestionService as ArticleIngestionService);
    jest.clearAllMocks();
    (redis.setex as jest.Mock).mockResolvedValue('OK');
    (redis.mget as jest.Mock).mockResolvedValue([]);
    (db.article.findMany as jest.Mock).mockResolvedValue([]);
  });

  describe('fetchPosts', () => {
    it('fetches fixed number of posts', async () => {
      const axios = require('axios');
      const posts = Array.from({ length: 50 }, (_, i) => ({
        data: {
          id: `p${i}`,
          title: `Post ${i}`,
          selftext: '',
          url: `https://reddit.com/p${i}`,
          author: 'user',
          created_utc: Date.now() / 1000,
          score: 100,
          num_comments: 10,
          permalink: `/r/technology/comments/p${i}`,
          subreddit: 'technology',
        },
      }));

      axios.get.mockResolvedValueOnce({
        data: {
          data: {
            children: posts,
          },
        },
      });

      const result = await aggregator.fetchPosts('technology');

      expect(result).toHaveLength(50);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      );
    });
  });
});
