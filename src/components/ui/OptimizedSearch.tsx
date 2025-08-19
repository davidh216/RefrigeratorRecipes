import React from 'react';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { Input } from './Input';

interface OptimizedSearchProps<T> {
  items: T[];
  searchKeys: (keyof T)[];
  onResultsChange: (results: T[]) => void;
  placeholder?: string;
  debounceMs?: number;
  minSearchLength?: number;
  caseSensitive?: boolean;
  exactMatch?: boolean;
  className?: string;
  disabled?: boolean;
}

export function OptimizedSearch<T>({
  items,
  searchKeys,
  onResultsChange,
  placeholder = 'Search...',
  debounceMs = 300,
  minSearchLength = 2,
  caseSensitive = false,
  exactMatch = false,
  className = '',
  disabled = false,
}: OptimizedSearchProps<T>) {
  const {
    searchQuery,
    setSearchQuery,
    filteredItems,
    isSearching,
    clearSearch,
  } = useDebouncedSearch({
    items,
    searchKeys,
    debounceMs,
    minSearchLength,
    caseSensitive,
    exactMatch,
  });

  // Notify parent of results changes
  React.useEffect(() => {
    onResultsChange(filteredItems);
  }, [filteredItems, onResultsChange]);

  return (
    <div className={`relative w-full ${className}`}>
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-10 w-full"
      />
      
      {/* Search indicator */}
      {isSearching && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
        </div>
      )}
      
      {/* Clear button */}
      {searchQuery && !isSearching && (
        <button
          onClick={clearSearch}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          type="button"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      {/* Results count */}
      {searchQuery && (
        <div className="absolute -bottom-6 left-0 text-xs text-gray-500">
          {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
