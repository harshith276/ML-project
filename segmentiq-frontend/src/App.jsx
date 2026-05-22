/**
 * App.jsx — root router for SegmentIQ.
 *
 * Routes:
 *   /            → LandingPage   (public)
 *   /auth        → AuthPage      (public)
 *   /dashboard   → DashboardPage (protected — requires valid JWT)
 *   *            → redirect to /
 *
 * Framer Motion v11 requires React 18+. SegmentIQ uses React 19 ✓
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage    from './pages/LandingPage';
import AuthPage       from './pages/AuthPage';
import DashboardPage  from './pages/DashboardPage';
import ProfileSettings from './pages/ProfileSettings';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"          element={<LandingPage />} />
          <Route path="/auth"      element={<AuthPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />
          {/* Catch-all — redirect unknown paths to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
