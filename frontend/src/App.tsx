import { Header, Container } from './components/layout';
import { SearchForm } from './components/search/SearchForm';
import { CategoryStats } from './components/stats/CategoryStats';
import { ArticleList, Pagination } from './components/articles';
import { useArticleSearch, useCategoryStats } from './hooks';

function App() {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    searchResults,
    isLoading,
    error,
    handleSearch,
    handlePageChange,
    currentPage,
    refetch,
    searchParams,
  } = useArticleSearch();

  // Get category stats filtered by current search (excluding category filter to show all categories)
  const { categoryStats } = useCategoryStats({
    query: searchParams.query,
    source: searchParams.source,
    startDate: searchParams.startDate,
    endDate: searchParams.endDate,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Header
        title="IT Newsfeed System"
        subtitle="Real-time IT news aggregation and classification"
      />

      <Container>
        <div className="space-y-12 py-4">
          <div className="space-y-3">
            <SearchForm
              query={searchQuery}
              category={selectedCategory}
              onQueryChange={setSearchQuery}
              onCategoryChange={setSelectedCategory}
              onSubmit={handleSearch}
            />
            {categoryStats && (
              <CategoryStats
                total={searchResults?.total || 0}
                stats={categoryStats}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
              />
            )}
          </div>

          <ArticleList
            articles={searchResults?.articles}
            total={searchResults?.total}
            isLoading={isLoading}
            error={error}
            onRetry={() => refetch()}
          />

          {searchResults && searchResults.total > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={searchResults.total}
              itemsPerPage={searchResults.limit}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </Container>
    </div>
  );
}

export default App;
