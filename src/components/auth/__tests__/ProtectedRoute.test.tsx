import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/utils/test-utils';
import ProtectedRoute from '../ProtectedRoute';

// Mock the useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = require('@/contexts/AuthContext').useAuth;

describe('ProtectedRoute', () => {
  const TestComponent = () => <div>Protected Content</div>;
  const CustomFallback = () => <div>Custom Fallback</div>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Check for the loading spinner container
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });

    it('should show loading spinner in full screen layout', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Check that the loading container has the full screen layout
      const container = document.querySelector('.flex.items-center.justify-center.min-h-screen');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Unauthenticated Access', () => {
    it('should show authentication required message when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('Please sign in to access this page.')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show sign in link when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      const signInLink = screen.getByRole('link', { name: /sign in/i });
      expect(signInLink).toBeInTheDocument();
      expect(signInLink).toHaveAttribute('href', '/auth/signin');
    });

    it('should show sign in link with proper styling', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      const signInLink = screen.getByRole('link', { name: /sign in/i });
      expect(signInLink).toHaveClass(
        'inline-flex',
        'items-center',
        'px-4',
        'py-2',
        'border',
        'border-transparent',
        'text-sm',
        'font-medium',
        'rounded-md',
        'shadow-sm',
        'text-white',
        'bg-blue-600',
        'hover:bg-blue-700',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-offset-2',
        'focus:ring-blue-500'
      );
    });

    it('should display fallback in full screen layout', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      const fallbackContainer = screen.getByText('Authentication Required').closest('div');
      expect(fallbackContainer?.parentElement).toHaveClass('flex', 'items-center', 'justify-center', 'min-h-screen');
    });

    it('should display fallback content in centered layout', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      const contentContainer = screen.getByText('Authentication Required').closest('div');
      expect(contentContainer).toHaveClass('text-center');
    });
  });

  describe('Authenticated Access', () => {
    it('should render children when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user', email: 'test@example.com' },
        loading: false,
      });

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should render multiple children when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user', email: 'test@example.com' },
        loading: false,
      });

      render(
        <ProtectedRoute>
          <div>First Child</div>
          <div>Second Child</div>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('First Child')).toBeInTheDocument();
      expect(screen.getByText('Second Child')).toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided and user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(
        <ProtectedRoute fallback={<CustomFallback />}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should not render custom fallback when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user', email: 'test@example.com' },
        loading: false,
      });

      render(
        <ProtectedRoute fallback={<CustomFallback />}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Custom Fallback')).not.toBeInTheDocument();
    });

    it('should not render custom fallback during loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      render(
        <ProtectedRoute fallback={<CustomFallback />}>
          <TestComponent />
        </ProtectedRoute>
      );

      // Check that loading state is shown (no content or auth message)
      expect(screen.queryByText('Custom Fallback')).not.toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user', email: 'test@example.com' },
        loading: false,
      });

      render(<ProtectedRoute>{null}</ProtectedRoute>);

      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user', email: 'test@example.com' },
        loading: false,
      });

      render(<ProtectedRoute>{undefined}</ProtectedRoute>);

      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should handle null fallback', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(
        <ProtectedRoute fallback={null}>
          <TestComponent />
        </ProtectedRoute>
      );

      // Should fall back to default fallback
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });

    it('should handle undefined fallback', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(
        <ProtectedRoute fallback={undefined}>
          <TestComponent />
        </ProtectedRoute>
      );

      // Should fall back to default fallback
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Authentication Required');
    });

    it('should have proper link semantics', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      const signInLink = screen.getByRole('link', { name: /sign in/i });
      expect(signInLink).toBeInTheDocument();
    });

    it('should have proper loading indicator', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Check that loading state is shown
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });
  });

  describe('Component Behavior', () => {
    it('should handle different user states correctly', () => {
      // Test authenticated state
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user', email: 'test@example.com' },
        loading: false,
      });

      const { rerender } = render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();

      // Test loading state
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      rerender(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Check that loading state is shown
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();

      // Test unauthenticated state
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      rerender(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });
  });
});
