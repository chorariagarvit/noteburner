import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_BASE } from '../utils/apiBase';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState(token ? 'verifying' : 'invalid');
  const [message, setMessage] = useState('');

  useEffect(() => {
    document.title = 'NoteBurner - Verify Email';
    if (!token) return;
    // Remove the one-time token from the address bar/history right away
    globalThis.history.replaceState({}, document.title, globalThis.location.pathname);

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setState('success');
        } else {
          setState('error');
          setMessage(data.error || 'This verification link is invalid or has expired.');
        }
      } catch {
        setState('error');
        setMessage('Could not reach the server. Please try again.');
      }
    })();
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Email verification</h1>
        {state === 'verifying' && <p className="text-gray-600 dark:text-gray-300">Verifying your email…</p>}
        {state === 'success' && (
          <>
            <p className="text-green-700 dark:text-green-400 mb-4">Your email has been verified. 🎉</p>
            <Link to="/login" className="btn-primary inline-block">Log in</Link>
          </>
        )}
        {(state === 'error' || state === 'invalid') && (
          <p className="text-red-700 dark:text-red-400">
            {state === 'invalid' ? 'This verification link is missing its token.' : message}
          </p>
        )}
      </div>
    </div>
  );
}
