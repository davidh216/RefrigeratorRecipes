import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfile } from '../UserProfile';
import * as auth from '@/lib/firebase/auth';

// Mock the Firebase auth functions
jest.mock('@/lib/firebase/auth', () => ({
  signOut: jest.fn(),
}));

// Mock the useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = require('@/contexts/AuthContext').useAuth;
const mockAuth = auth as jest.Mocked<typeof auth>;

describe('UserProfile', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/avatar.jpg',
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: '2023-01-01T00:00:00.000Z',
      lastSignInTime: '2023-01-01T00:00:00.000Z',
    },
    providerData: [],
    refreshToken: 'mock-refresh-token',
    tenantId: null,
    delete: jest.fn(),
    getIdToken: jest.fn(),
    getIdTokenResult: jest.fn(),
    reload: jest.fn(),
    toJSON: jest.fn(),
    phoneNumber: null,
    providerId: 'password',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading skeleton when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      // Check for loading skeleton elements
      const skeletonElements = document.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('should show loading skeleton with proper structure', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      const container = document.querySelector('.flex.items-center.space-x-2');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Unauthenticated User', () => {
    it('should show sign in and sign up links when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
    });

    it('should have correct href attributes for auth links', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      const signInLink = screen.getByRole('link', { name: /sign in/i });
      const signUpLink = screen.getByRole('link', { name: /sign up/i });

      expect(signInLink).toHaveAttribute('href', '/auth/signin');
      expect(signUpLink).toHaveAttribute('href', '/auth/signup');
    });

    it('should show demo mode toggle button when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      expect(screen.getByRole('button', { name: /🎮 demo mode/i })).toBeInTheDocument();
    });

    it('should show demo mode as active when isDemoMode is true', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isDemoMode: true,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      expect(screen.getByRole('button', { name: /🚀 demo mode/i })).toBeInTheDocument();
    });

    it('should call enableDemoMode when demo mode button is clicked and not in demo mode', async () => {
      const mockEnableDemoMode = jest.fn();
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isDemoMode: false,
        enableDemoMode: mockEnableDemoMode,
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      const demoButton = screen.getByRole('button', { name: /🎮 demo mode/i });
      await userEvent.click(demoButton);

      expect(mockEnableDemoMode).toHaveBeenCalled();
    });

    it('should call disableDemoMode when demo mode button is clicked and in demo mode', async () => {
      const mockDisableDemoMode = jest.fn();
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isDemoMode: true,
        enableDemoMode: jest.fn(),
        disableDemoMode: mockDisableDemoMode,
      });

      render(<UserProfile />);

      const demoButton = screen.getByRole('button', { name: /🚀 demo mode/i });
      await userEvent.click(demoButton);

      expect(mockDisableDemoMode).toHaveBeenCalled();
    });
  });

  describe('Authenticated User', () => {
    it('should display user avatar when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      const avatar = screen.getByRole('img');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(avatar).toHaveAttribute('alt', 'Test User');
    });

    it('should display user display name when available', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should display user email when display name is not available', () => {
      const userWithoutDisplayName = { ...mockUser, displayName: null };
      mockUseAuth.mockReturnValue({
        user: userWithoutDisplayName,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should display sign out button when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    it('should call signOut when sign out button is clicked', async () => {
      mockAuth.signOut.mockResolvedValue();
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await userEvent.click(signOutButton);

      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAuth.signOut.mockRejectedValue(new Error('Sign out failed'));
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await userEvent.click(signOutButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error signing out:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Demo Mode with Authenticated User', () => {
    it('should show demo badge when user is authenticated and in demo mode', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isDemoMode: true,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      expect(screen.getByText('Demo')).toBeInTheDocument();
      expect(screen.getByText('Demo')).toHaveClass('bg-purple-100', 'text-purple-700');
    });

    it('should show exit demo button when user is authenticated and in demo mode', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isDemoMode: true,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      expect(screen.getByRole('button', { name: /exit demo/i })).toBeInTheDocument();
    });

    it('should call disableDemoMode when exit demo button is clicked', async () => {
      const mockDisableDemoMode = jest.fn();
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isDemoMode: true,
        enableDemoMode: jest.fn(),
        disableDemoMode: mockDisableDemoMode,
      });

      render(<UserProfile />);

      const exitDemoButton = screen.getByRole('button', { name: /exit demo/i });
      await userEvent.click(exitDemoButton);

      expect(mockDisableDemoMode).toHaveBeenCalled();
    });

    it('should not show demo badge when user is authenticated but not in demo mode', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      expect(screen.queryByText('Demo')).not.toBeInTheDocument();
    });

    it('should not show exit demo button when user is authenticated but not in demo mode', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      expect(screen.queryByRole('button', { name: /exit demo/i })).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user without photoURL', () => {
      const userWithoutPhoto = { ...mockUser, photoURL: null };
      mockUseAuth.mockReturnValue({
        user: userWithoutPhoto,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      // When photoURL is null, Avatar component shows a fallback with "?" character
      expect(screen.getByText('?')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should handle user without display name or email', () => {
      const userWithoutNameOrEmail = { ...mockUser, displayName: null, email: null };
      mockUseAuth.mockReturnValue({
        user: userWithoutNameOrEmail,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('alt', 'User');
    });

    it('should handle user with empty display name', () => {
      const userWithEmptyName = { ...mockUser, displayName: '' };
      mockUseAuth.mockReturnValue({
        user: userWithEmptyName,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper link semantics for auth links', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      const signInLink = screen.getByRole('link', { name: /sign in/i });
      const signUpLink = screen.getByRole('link', { name: /sign up/i });

      expect(signInLink).toBeInTheDocument();
      expect(signUpLink).toBeInTheDocument();
    });

    it('should have proper button semantics for interactive elements', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      expect(signOutButton).toBeInTheDocument();
    });

    it('should have proper alt text for avatar', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('alt', 'Test User');
    });
  });

  describe('Styling and Layout', () => {
    it('should have proper layout structure for authenticated user', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      const container = document.querySelector('.flex.items-center.space-x-3');
      expect(container).toBeInTheDocument();
    });

    it('should have proper layout structure for unauthenticated user', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      const container = screen.getByRole('link', { name: /sign in/i }).closest('div');
      expect(container).toHaveClass('flex', 'items-center', 'space-x-2');
    });

    it('should have proper demo mode button styling when active', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isDemoMode: true,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      const demoButton = screen.getByRole('button', { name: /🚀 demo mode/i });
      expect(demoButton).toHaveClass('text-green-600', 'hover:text-green-500');
    });

    it('should have proper demo mode button styling when inactive', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isDemoMode: false,
        enableDemoMode: jest.fn(),
        disableDemoMode: jest.fn(),
      });

      render(<UserProfile />);

      const demoButton = screen.getByRole('button', { name: /🎮 demo mode/i });
      expect(demoButton).toHaveClass('text-purple-600', 'hover:text-purple-500');
    });
  });
});
