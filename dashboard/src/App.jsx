import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'

// Marketing pages
import HomePage from './pages/marketing/HomePage'
import PricingPage from './pages/marketing/PricingPage'
import AboutPage from './pages/marketing/AboutPage'
import DocsPage from './pages/marketing/DocsPage'
import CookiesPage from './pages/marketing/CookiesPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

// Components
import CookieConsent from './components/common/CookieConsent'

// Dashboard pages
import UserDashboard from './pages/dashboard/user/UserDashboard'
import AdminDashboard from './pages/dashboard/admin/AdminDashboard'
import DevDashboard from './pages/dashboard/developer/DevDashboard'
import SuperAdminDashboard from './pages/dashboard/superadmin/SuperAdminDashboard'

// Auth guard
import { useAuthStore } from './store/authStore'
import LoadingSpinner from './components/ui/LoadingSpinner'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function DashboardRouter() {
  const { user } = useAuthStore()

  switch (user?.role) {
    case 'superadmin': return <Navigate to="/dashboard/superadmin" replace />
    case 'admin': return <Navigate to="/dashboard/admin" replace />
    case 'developer': return <Navigate to="/dashboard/developer" replace />
    default: return <Navigate to="/dashboard/user" replace />
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Marketing */}
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/cookies" element={<CookiesPage />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Dashboard router */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          } />

          {/* Role dashboards */}
          <Route path="/dashboard/user/*" element={
            <ProtectedRoute allowedRoles={['user', 'staff', 'admin', 'developer', 'superadmin']}>
              <UserDashboard />
            </ProtectedRoute>
          } />

          <Route path="/dashboard/admin/*" element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/dashboard/developer/*" element={
            <ProtectedRoute allowedRoles={['developer', 'superadmin']}>
              <DevDashboard />
            </ProtectedRoute>
          } />

          <Route path="/dashboard/superadmin/*" element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <CookieConsent />
    </BrowserRouter>
  )
}
