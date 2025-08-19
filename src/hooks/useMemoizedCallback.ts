import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Memoized callback with dependency tracking
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: any[],
  options?: {
    maxAge?: number; // Maximum age of memoized value in milliseconds
    equalityFn?: (prev: any[], next: any[]) => boolean; // Custom equality function
  }
): T {
  const { maxAge, equalityFn } = options || {};
  const lastCallRef = useRef<{ args: any[]; result: any; timestamp: number } | null>(null);
  const depsRef = useRef<any[]>(dependencies);

  // Custom equality check
  const areDepsEqual = useCallback((prev: any[], next: any[]) => {
    if (equalityFn) {
      return equalityFn(prev, next);
    }
    
    if (prev.length !== next.length) {
      return false;
    }
    
    return prev.every((dep, index) => dep === next[index]);
  }, [equalityFn]);

  // Check if we can reuse the last result
  const canReuseResult = useCallback(() => {
    if (!lastCallRef.current) {
      return false;
    }

    const { timestamp } = lastCallRef.current;
    
    // Check max age
    if (maxAge && Date.now() - timestamp > maxAge) {
      return false;
    }

    // Check dependencies
    return areDepsEqual(depsRef.current, dependencies);
  }, [dependencies, maxAge, areDepsEqual]);

  const memoizedCallback = useCallback((...args: any[]) => {
    if (canReuseResult() && lastCallRef.current) {
      return lastCallRef.current.result;
    }

    const result = callback(...args);
    lastCallRef.current = {
      args,
      result,
      timestamp: Date.now(),
    };
    depsRef.current = dependencies;

    return result;
  }, [callback, dependencies, canReuseResult]);

  return memoizedCallback as T;
}

// Memoized value with automatic cleanup
export function useMemoizedValue<T>(
  factory: () => T,
  dependencies: any[],
  options?: {
    maxAge?: number;
    cleanup?: (value: T) => void;
  }
): T {
  const { maxAge, cleanup } = options || {};
  const valueRef = useRef<T | null>(null);
  const depsRef = useRef<any[]>(dependencies);
  const timestampRef = useRef<number>(0);

  const memoizedValue = useMemo(() => {
    const now = Date.now();
    
    // Check if we can reuse the cached value
    if (valueRef.current !== null) {
      // Check max age
      if (maxAge && now - timestampRef.current > maxAge) {
        if (cleanup) {
          cleanup(valueRef.current);
        }
      } else {
        // Check dependencies
        if (depsRef.current.length === dependencies.length &&
            depsRef.current.every((dep, index) => dep === dependencies[index])) {
          return valueRef.current;
        }
      }
    }

    // Create new value
    const newValue = factory();
    valueRef.current = newValue;
    depsRef.current = dependencies;
    timestampRef.current = now;

    return newValue;
  }, [factory, dependencies, maxAge, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanup && valueRef.current !== null) {
        cleanup(valueRef.current);
      }
    };
  }, [cleanup]);

  return memoizedValue;
}

// Memoized selector for complex state selections
export function useMemoizedSelector<TState, TSelected>(
  state: TState,
  selector: (state: TState) => TSelected,
  equalityFn?: (prev: TSelected, next: TSelected) => boolean
): TSelected {
  const prevSelectedRef = useRef<TSelected | null>(null);

  return useMemo(() => {
    const selected = selector(state);
    
    if (prevSelectedRef.current !== null) {
      if (equalityFn) {
        if (equalityFn(prevSelectedRef.current, selected)) {
          return prevSelectedRef.current;
        }
      } else if (prevSelectedRef.current === selected) {
        return prevSelectedRef.current;
      }
    }
    
    prevSelectedRef.current = selected;
    return selected;
  }, [state, selector, equalityFn]);
}

// Debounced memoization for expensive computations
export function useDebouncedMemo<T>(
  factory: () => T,
  dependencies: any[],
  delay: number
): T {
  const [debouncedDeps, setDebouncedDeps] = useState(dependencies);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedDeps(dependencies);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [dependencies, delay]);

  return useMemo(() => factory(), [factory, debouncedDeps]);
}
