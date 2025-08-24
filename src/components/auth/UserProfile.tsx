'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/firebase/auth';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

interface UserProfileProps {
  compact?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({ compact = false }) => {
  const { user, loading, isDemoMode, enableDemoMode, disableDemoMode } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        {!compact && <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>}
      </div>
    );
  }

  if (!user) {
    if (compact) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={isDemoMode ? disableDemoMode : enableDemoMode}
          className={`text-lg px-2 py-1 ${
            isDemoMode 
              ? 'text-green-600 hover:text-green-500' 
              : 'text-purple-600 hover:text-purple-500'
          }`}
          title={isDemoMode ? 'Demo Mode Active' : 'Enable Demo Mode'}
        >
          {isDemoMode ? '🚀' : '🎮'}
        </Button>
      );
    }
    
    return (
      <div className="flex items-center space-x-2">
        <a 
          href="/auth/signin"
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          Sign In
        </a>
        <span className="text-gray-300">|</span>
        <a 
          href="/auth/signup"
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          Sign Up
        </a>
        <span className="text-gray-300">|</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={isDemoMode ? disableDemoMode : enableDemoMode}
          className={`text-sm px-2 py-1 ${
            isDemoMode 
              ? 'text-green-600 hover:text-green-500' 
              : 'text-purple-600 hover:text-purple-500'
          }`}
        >
          {isDemoMode ? '🚀 Demo Mode' : '🎮 Demo Mode'}
        </Button>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="relative">
        <Avatar 
          src={user.photoURL || undefined}
          alt={user.displayName || user.email || 'User'}
          size="sm"
          className="cursor-pointer"
          title={`${user.displayName || user.email}${isDemoMode ? ' (Demo Mode)' : ''}`}
        />
        {isDemoMode && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border border-white"></div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <Avatar 
        src={user.photoURL || undefined}
        alt={user.displayName || user.email || 'User'}
        size="sm"
      />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">
          {user.displayName || user.email}
          {isDemoMode && (
            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              Demo
            </span>
          )}
        </span>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-xs text-gray-500 hover:text-gray-700 p-0 h-auto justify-start"
          >
            Sign Out
          </Button>
          {isDemoMode && (
            <>
              <span className="text-gray-300 text-xs">|</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={disableDemoMode}
                className="text-xs text-purple-600 hover:text-purple-500 p-0 h-auto justify-start"
              >
                Exit Demo
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};