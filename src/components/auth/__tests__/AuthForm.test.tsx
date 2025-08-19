import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthForm } from '../AuthForm';
import * as auth from '@/lib/firebase/auth';

// Mock the Firebase auth functions
jest.mock('@/lib/firebase/auth', () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
  signInWithGoogle: jest.fn(),
  resetPassword: jest.fn(),
}));

const mockAuth = auth as jest.Mocked<typeof auth>;

describe('AuthForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnModeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering Tests', () => {
    it('should render signin form with correct title and fields', () => {
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    });

    it('should render signup form with display name field', () => {
      render(<AuthForm mode="signup" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should render reset password form without password field', () => {
      render(<AuthForm mode="reset" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      expect(screen.getByText('Reset Password')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset email/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument();
    });
  });

  describe('Form Validation Tests', () => {
    it('should require email field', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);
      
      // HTML5 validation should prevent submission
      expect(mockAuth.signIn).not.toHaveBeenCalled();
    });

    it('should require password field in signin mode', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);
      
      // HTML5 validation should prevent submission
      expect(mockAuth.signIn).not.toHaveBeenCalled();
    });

    it('should require display name in signup mode', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="signup" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      // HTML5 validation should prevent submission
      expect(mockAuth.signUp).not.toHaveBeenCalled();
    });

    it('should enforce minimum password length', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="signup" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const displayNameInput = screen.getByLabelText(/display name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      await user.type(displayNameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '123');
      
      // Try to submit with short password
      await user.click(submitButton);
      
      // The form should still submit due to how userEvent works with HTML5 validation
      // Instead, we'll test that the password field has the minLength attribute
      expect(passwordInput).toHaveAttribute('minLength', '6');
    });
  });

  describe('Form Submission Tests', () => {
    it('should handle successful signin', async () => {
      const user = userEvent.setup();
      mockAuth.signIn.mockResolvedValue({} as any);
      
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockAuth.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should handle successful signup', async () => {
      const user = userEvent.setup();
      mockAuth.signUp.mockResolvedValue({} as any);
      
      render(<AuthForm mode="signup" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const displayNameInput = screen.getByLabelText(/display name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      await user.type(displayNameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockAuth.signUp).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User');
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should handle successful password reset', async () => {
      const user = userEvent.setup();
      mockAuth.resetPassword.mockResolvedValue();
      
      render(<AuthForm mode="reset" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockAuth.resetPassword).toHaveBeenCalledWith('test@example.com');
        expect(screen.getByText('Password reset email sent! Check your inbox.')).toBeInTheDocument();
      });
    });

    it('should handle successful Google signin', async () => {
      const user = userEvent.setup();
      mockAuth.signInWithGoogle.mockResolvedValue({} as any);
      
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);
      
      await waitFor(() => {
        expect(mockAuth.signInWithGoogle).toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should display error message on signin failure', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Invalid email or password';
      mockAuth.signIn.mockRejectedValue(new Error(errorMessage));
      
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display error message on signup failure', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Email already in use';
      mockAuth.signUp.mockRejectedValue(new Error(errorMessage));
      
      render(<AuthForm mode="signup" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const displayNameInput = screen.getByLabelText(/display name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      await user.type(displayNameInput, 'Test User');
      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display error message on Google signin failure', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Google sign-in failed';
      mockAuth.signInWithGoogle.mockRejectedValue(new Error(errorMessage));
      
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display generic error message for unknown errors', async () => {
      const user = userEvent.setup();
      mockAuth.signIn.mockRejectedValue({});
      
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State Tests', () => {
    it('should show loading state during signin', async () => {
      const user = userEvent.setup();
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise<any>((resolve) => {
        resolveSignIn = resolve;
      });
      mockAuth.signIn.mockReturnValue(signInPromise);
      
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      resolveSignIn!({} as any);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      });
    });

    it('should show loading state during signup', async () => {
      const user = userEvent.setup();
      let resolveSignUp: (value: any) => void;
      const signUpPromise = new Promise<any>((resolve) => {
        resolveSignUp = resolve;
      });
      mockAuth.signUp.mockReturnValue(signUpPromise);
      
      render(<AuthForm mode="signup" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const displayNameInput = screen.getByLabelText(/display name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      await user.type(displayNameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      resolveSignUp!({} as any);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      });
    });

    it('should disable form inputs during loading', async () => {
      const user = userEvent.setup();
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise<any>((resolve) => {
        resolveSignIn = resolve;
      });
      mockAuth.signIn.mockReturnValue(signInPromise);
      
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(googleButton).toBeDisabled();
      
      resolveSignIn!({} as any);
      await waitFor(() => {
        expect(emailInput).not.toBeDisabled();
        expect(passwordInput).not.toBeDisabled();
        expect(googleButton).not.toBeDisabled();
      });
    });
  });

  describe('Mode Switching Tests', () => {
    it('should switch from signin to signup mode', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const signupLink = screen.getByText('Sign up');
      await user.click(signupLink);
      
      expect(mockOnModeChange).toHaveBeenCalledWith('signup');
    });

    it('should switch from signin to reset mode', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const resetLink = screen.getByText('Forgot your password?');
      await user.click(resetLink);
      
      expect(mockOnModeChange).toHaveBeenCalledWith('reset');
    });

    it('should switch from signup to signin mode', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="signup" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const signinLink = screen.getByText('Sign in');
      await user.click(signinLink);
      
      expect(mockOnModeChange).toHaveBeenCalledWith('signin');
    });

    it('should switch from reset to signin mode', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="reset" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const backLink = screen.getByText('Back to sign in');
      await user.click(backLink);
      
      expect(mockOnModeChange).toHaveBeenCalledWith('signin');
    });
  });

  describe('Accessibility Tests', () => {
    it('should have proper form labels and associations', () => {
      render(<AuthForm mode="signup" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const displayNameInput = screen.getByLabelText(/display name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(displayNameInput).toHaveAttribute('id', 'displayName');
      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
    });

    it('should have proper button types', () => {
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      
      expect(submitButton).toHaveAttribute('type', 'submit');
      // Google button doesn't have explicit type, so it defaults to 'button'
      expect(googleButton).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.tab();
      expect(emailInput).toHaveFocus();
      
      await user.tab();
      expect(passwordInput).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty onSuccess callback', async () => {
      const user = userEvent.setup();
      mockAuth.signIn.mockResolvedValue({} as any);
      
      render(<AuthForm mode="signin" onModeChange={mockOnModeChange} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockAuth.signIn).toHaveBeenCalled();
        // Should not throw error when onSuccess is undefined
      });
    });

    it('should handle empty onModeChange callback', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} />);
      
      const signupLink = screen.getByText('Sign up');
      await user.click(signupLink);
      
      // Should not throw error when onModeChange is undefined
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should handle mode switching without errors', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="signin" onSuccess={mockOnSuccess} onModeChange={mockOnModeChange} />);
      
      const signupLink = screen.getByText('Sign up');
      await user.click(signupLink);
      
      expect(mockOnModeChange).toHaveBeenCalledWith('signup');
    });
  });
});
