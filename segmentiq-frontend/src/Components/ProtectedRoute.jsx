import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute — validates the JWT stored in localStorage against the
 * backend /auth/me endpoint before rendering children.
 *
 * Behaviour:
 *  - Shows a minimal loading screen while the token is being verified.
 *  - Redirects to /auth if no token is found or the token is invalid/expired.
 *  - Renders children only after a successful 200 from /auth/me.
 */
export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'ok' | 'denied'

  useEffect(() => {
    const token = localStorage.getItem('segmentiq_token');
    if (!token) {
      setStatus('denied');
      return;
    }

    fetch('https://segmentiq-api.onrender.com/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => setStatus(res.ok ? 'ok' : 'denied'))
      .catch(() => setStatus('denied'));
  }, []);

  if (status === 'checking') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0A0D14' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
               style={{ borderColor: 'rgba(0,212,170,0.3)', borderTopColor: '#00D4AA' }} />
          <p className="text-sm" style={{ color: 'rgba(240,242,250,0.5)' }}>
            Verifying session…
          </p>
        </div>
      </div>
    );
  }

  if (status === 'denied') return <Navigate to="/auth" replace />;

  return children;
}
