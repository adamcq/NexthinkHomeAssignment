import { Category } from '@prisma/client';

/**
 * Discriminator for metadata type
 */
export type MetadataSource = 'rss' | 'reddit' | 'unknown';

/**
 * Base metadata fields shared across all sources
 */
export interface BaseMetadata {
  type: MetadataSource;
  source?: string;
  author?: string;
  fetchedAt?: string;
}

/**
 * RSS-specific metadata fields
 */
export interface RSSMetadata extends BaseMetadata {
  type: 'rss';
  feedUrl?: string;
  rssCategories?: string[];
  guid?: string;
}

/**
 * Reddit-specific metadata fields
 */
export interface RedditMetadata extends BaseMetadata {
  type: 'reddit';
  subreddit: string;
  score?: number;
  num_comments?: number;
  permalink?: string;
  external_url?: string | null;
}

/**
 * Unknown/fallback metadata for edge cases
 */
export interface UnknownMetadata extends BaseMetadata {
  type: 'unknown';
}

/**
 * Union type for source metadata (before classification enrichment)
 */
export type SourceMetadata = RSSMetadata | RedditMetadata | UnknownMetadata;

/**
 * Classification enrichment fields added after LLM classification
 */
export interface ClassificationEnrichment {
  secondaryCategories?: Array<{
    category: Category;
    confidence: number;
  }>;
  classificationReasoning?: string;
  classifiedAt?: string;
}

/**
 * Complete metadata type (after classification)
 * Combines source-specific metadata with classification results
 */
export type EnrichedMetadata = (RSSMetadata | RedditMetadata | UnknownMetadata) & ClassificationEnrichment;

/**
 * Type guard to check if metadata is RSS-specific
 */
export function isRSSMetadata(metadata: any): metadata is RSSMetadata {
  return metadata?.type === 'rss';
}

/**
 * Type guard to check if metadata is Reddit-specific
 */
export function isRedditMetadata(metadata: any): metadata is RedditMetadata {
  return metadata?.type === 'reddit';
}

/**
 * Type guard to check if metadata is unknown/fallback type
 */
export function isUnknownMetadata(metadata: any): metadata is UnknownMetadata {
  return metadata?.type === 'unknown';
}

/**
 * Type guard to check if metadata has been enriched with classification
 */
export function isEnrichedMetadata(metadata: any): metadata is EnrichedMetadata {
  return metadata && 'classifiedAt' in metadata;
}

/**
 * Type guard to validate source metadata structure
 */
export function isSourceMetadata(metadata: any): metadata is SourceMetadata {
  return metadata && typeof metadata === 'object' && 
         'type' in metadata && 
         (metadata.type === 'rss' || metadata.type === 'reddit' || metadata.type === 'unknown');
}
