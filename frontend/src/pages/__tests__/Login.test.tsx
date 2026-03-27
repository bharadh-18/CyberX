import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Login from '../Login';

// Mock Zustand store and Axios API
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ setAuth: vi.fn() })
}));
vi.mock('@/lib/api', () => ({
  api: { post: vi.fn() }
}));

describe('Login Component MVP Security Tests', () => {
  const renderLogin = () => render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );

  it('renders correctly with required secure fields', () => {
    renderLogin();
    
    // Check if email and password inputs are present
    expect(screen.getByPlaceholderText('you@example.com')).toBeDefined();
    
    // Look for the password input instead of "Password" label specifically to avoid ambiguity
    const passwordInput = screen.getByPlaceholderText('••••••••••••');
    expect(passwordInput).toBeDefined();
    
    // Check if submit button is present
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
  });
});
