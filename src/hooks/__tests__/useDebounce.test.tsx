import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '../useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))

    expect(result.current).toBe('initial')
  })

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    // Change the value
    rerender({ value: 'changed', delay: 500 })

    // Value should still be the initial value
    expect(result.current).toBe('initial')

    // Fast forward time
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Now the value should be updated
    expect(result.current).toBe('changed')
  })

  it('should cancel previous timer when value changes quickly', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    // Change value multiple times quickly
    rerender({ value: 'first', delay: 500 })
    act(() => {
      jest.advanceTimersByTime(100)
    })

    rerender({ value: 'second', delay: 500 })
    act(() => {
      jest.advanceTimersByTime(100)
    })

    rerender({ value: 'final', delay: 500 })

    // Value should still be initial
    expect(result.current).toBe('initial')

    // Fast forward to just before the delay
    act(() => {
      jest.advanceTimersByTime(400)
    })

    // Value should still be initial
    expect(result.current).toBe('initial')

    // Fast forward to complete the delay
    act(() => {
      jest.advanceTimersByTime(100)
    })

    // Now the value should be the final value
    expect(result.current).toBe('final')
  })

  it('should work with different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 1000 } }
    )

    rerender({ value: 'changed', delay: 1000 })

    // After 500ms, value should still be initial
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(result.current).toBe('initial')

    // After 1000ms, value should be changed
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(result.current).toBe('changed')
  })

  it('should work with zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 0 } }
    )

    rerender({ value: 'changed', delay: 0 })

    // With zero delay, value should update immediately
    act(() => {
      jest.advanceTimersByTime(0)
    })
    expect(result.current).toBe('changed')
  })

  it('should work with different data types', () => {
    // Test with number
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 500 } }
    )

    numberRerender({ value: 42, delay: 500 })
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(numberResult.current).toBe(42)

    // Test with boolean
    const { result: booleanResult, rerender: booleanRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: false, delay: 500 } }
    )

    booleanRerender({ value: true, delay: 500 })
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(booleanResult.current).toBe(true)

    // Test with object
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: { name: 'initial' }, delay: 500 } }
    )

    objectRerender({ value: { name: 'changed' }, delay: 500 })
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(objectResult.current).toEqual({ name: 'changed' })
  })

  it('should handle delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    rerender({ value: 'changed', delay: 1000 })

    // After 500ms with new delay, value should still be initial
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(result.current).toBe('initial')

    // After 1000ms, value should be changed
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(result.current).toBe('changed')
  })
})
