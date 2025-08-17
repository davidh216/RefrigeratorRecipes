'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { signIn, signUp, signInWithGoogle, resetPassword } from '@/lib/firebase/auth';

interface AuthFormProps {
  mode: 'signin' | 'signup' | 'reset';
  onSuccess?: () => void;
  onModeChange?: (mode: 'signin' | 'signup' | 'reset') => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ 
  mode, 
  onSuccess,
  onModeChange 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      switch (mode) {
        case 'signin':
          await signIn(email, password);
          onSuccess?.();
          break;
        case 'signup':
          await signUp(email, password, displayName);
          onSuccess?.();
          break;
        case 'reset':
          await resetPassword(email);
          setSuccess('Password reset email sent! Check your inbox.');
          break;
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err: unknown) {
      setError((err as Error).message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signin': return 'Sign In';
      case 'signup': return 'Sign Up';
      case 'reset': return 'Reset Password';
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case 'signin': return loading ? 'Signing In...' : 'Sign In';
      case 'signup': return loading ? 'Creating Account...' : 'Create Account';
      case 'reset': return loading ? 'Sending...' : 'Send Reset Email';
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        {getTitle()}
      </h2>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-4">
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {mode !== 'reset' && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {getButtonText()}
        </Button>
      </form>

      {mode !== 'reset' && (
        <>
          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full mt-4"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            Continue with Google
          </Button>
        </>
      )}

      <div className="mt-6 text-center space-y-2">
        {mode === 'signin' && (
          <>
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-500"
              onClick={() => onModeChange?.('reset')}
            >
              Forgot your password?
            </button>
            <div>
              <span className="text-sm text-gray-600">Don&apos;t have an account? </span>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-500"
                onClick={() => onModeChange?.('signup')}
              >
                Sign up
              </button>
            </div>
          </>
        )}

        {mode === 'signup' && (
          <div>
            <span className="text-sm text-gray-600">Already have an account? </span>
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-500"
              onClick={() => onModeChange?.('signin')}
            >
              Sign in
            </button>
          </div>
        )}

        {mode === 'reset' && (
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-500"
            onClick={() => onModeChange?.('signin')}
          >
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
};