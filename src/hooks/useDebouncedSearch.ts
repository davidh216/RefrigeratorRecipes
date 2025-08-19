import { useState, useEffect, useCallback, useMemo } from 'react';

interface UseDebouncedSearchOptions<T> {
  items: T[];
  searchKeys: (keyof T)[];
  debounceMs?: number;
  minSearchLength?: number;
  caseSensitive?: boolean;
  exactMatch?: boolean;
}

interface UseDebouncedSearchReturn<T> {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedQuery: string;
  filteredItems: T[];
  isSearching: boolean;
  clearSearch: () => void;
}

export function useDebouncedSearch<T>(
  options: UseDebouncedSearchOptions<T>
): UseDebouncedSearchReturn<T> {
  const {
    items,
    searchKeys,
    debounceMs = 300,
    minSearchLength = 2,
    caseSensitive = false,
    exactMatch = false,
  } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce the search query
  useEffect(() => {
    setIsSearching(true);
    
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setIsSearching(false);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      setIsSearching(false);
    };
  }, [searchQuery, debounceMs]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < minSearchLength) {
      return items;
    }

    const query = caseSensitive ? debouncedQuery : debouncedQuery.toLowerCase();

    return items.filter(item => {
      return searchKeys.some(key => {
        const value = item[key];
        if (value == null) return false;

        const stringValue = String(value);
        const searchValue = caseSensitive ? stringValue : stringValue.toLowerCase();

        if (exactMatch) {
          return searchValue === query;
        } else {
          return searchValue.includes(query);
        }
      });
    });
  }, [items, debouncedQuery, searchKeys, minSearchLength, caseSensitive, exactMatch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    filteredItems,
    isSearching,
    clearSearch,
  };
}
