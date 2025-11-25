export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const CATEGORIES = [
  'CYBERSECURITY',
  'AI_EMERGING_TECH',
  'SOFTWARE_DEVELOPMENT',
  'HARDWARE_DEVICES',
  'TECH_INDUSTRY_BUSINESS',
  'OTHER',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  CYBERSECURITY: 'Cybersecurity',
  AI_EMERGING_TECH: 'AI & Emerging Tech',
  SOFTWARE_DEVELOPMENT: 'Software & Development',
  HARDWARE_DEVICES: 'Hardware & Devices',
  TECH_INDUSTRY_BUSINESS: 'Tech Industry & Business',
  OTHER: 'Other',
};

export const SOURCES = ['reddit', 'arstechnica', 'techcrunch'] as const;
