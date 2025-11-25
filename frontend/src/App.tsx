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
  } = useArticleSearch();

  const { categoryStats } = useCategoryStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="IT Newsfeed System"
        subtitle="Real-time IT news aggregation and classification"
      />

      <Container>
        <div className="space-y-8">
          <SearchForm
            query={searchQuery}
            category={selectedCategory}
            onQueryChange={setSearchQuery}
            onCategoryChange={setSelectedCategory}
            onSubmit={handleSearch}
          />

          {categoryStats && <CategoryStats stats={categoryStats} />}

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
