# Frontend Tests

This directory contains unit tests for the frontend application using Vitest and React Testing Library.

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
src/__tests__/
├── setup.ts                 # Test setup and configuration
├── components/              # Component tests
│   ├── ArticleCard.test.tsx
│   ├── Pagination.test.tsx
│   └── SearchForm.test.tsx
├── hooks/                   # Custom hook tests
│   └── useArticleSearch.test.tsx
├── services/                # API service tests
│   └── api.test.ts
└── types/                   # Type validation tests
    └── types.test.ts
```

## Test Coverage

The tests cover:

### Components
- **SearchForm**: User interactions, form submission, category selection
- **ArticleCard**: Rendering article data, links, metadata display
- **Pagination**: Page navigation, button states, page calculations

### Hooks
- **useArticleSearch**: State management, search execution, pagination

### Services
- **API**: HTTP requests, response handling, error cases

### Types
- Type safety and validation for TypeScript types