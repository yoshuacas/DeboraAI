'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Login Page
 *
 * Handles authentication for DeboraAI admin interface.
 * Uses NextAuth with credentials provider.
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setIsLoading(false);
      } else if (result?.ok) {
        router.push(callbackUrl);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900">DeboraAI</h1>
        <h2 className="mt-6 text-center text-2xl font-semibold text-gray-700">
          Sign in to Admin Panel
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Error message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="username"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Submit button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          {/* Development hint */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Development Quick Login</span>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {/* Quick login buttons */}
                <button
                  type="button"
                  onClick={() => {
                    setEmail('lawyer@deboraai.local');
                    setPassword('lawyer123');
                  }}
                  className="w-full px-4 py-2 border border-blue-300 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  🧑‍⚖️ Login as Lawyer (María García)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@deboraai.local');
                    setPassword('admin123');
                  }}
                  className="w-full px-4 py-2 border border-purple-300 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors text-sm font-medium"
                >
                  👨‍💼 Login as Admin
                </button>

                <div className="mt-4 text-xs text-gray-500 space-y-1">
                  <p className="font-medium">Lawyer credentials:</p>
                  <p>Email: <code className="bg-gray-100 px-1 py-0.5 rounded">lawyer@deboraai.local</code></p>
                  <p>Password: <code className="bg-gray-100 px-1 py-0.5 rounded">lawyer123</code></p>
                  <p className="mt-2 font-medium">Admin credentials:</p>
                  <p>Email: <code className="bg-gray-100 px-1 py-0.5 rounded">admin@deboraai.local</code></p>
                  <p>Password: <code className="bg-gray-100 px-1 py-0.5 rounded">admin123</code></p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
