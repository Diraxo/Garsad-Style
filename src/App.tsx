import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { PageLoading } from './components/common/Basics'
import Login from './pages/Login'
import Unauthorized from './pages/Unauthorized'
import Dashboard from './pages/admin/Dashboard'
import Products from './pages/admin/Products'
import Inventory from './pages/admin/Inventory'
import Sales from './pages/admin/Sales'
import Categories from './pages/admin/Categories'
import PaymentMethods from './pages/admin/PaymentMethods'
import Sellers from './pages/admin/Sellers'
import Settings from './pages/admin/Settings'
import SellerHome from './pages/seller/SellerHome'
import SellerSales from './pages/seller/SellerSales'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoading label="Loading Garsad…" />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'admin' ? '/dashboard' : '/seller'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            <Route path="/dashboard" element={<ProtectedRoute allow={['admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute allow={['admin']}><Products /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute allow={['admin']}><Inventory /></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute allow={['admin']}><Sales /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute allow={['admin']}><Categories /></ProtectedRoute>} />
            <Route path="/payment-methods" element={<ProtectedRoute allow={['admin']}><PaymentMethods /></ProtectedRoute>} />
            <Route path="/sellers" element={<ProtectedRoute allow={['admin']}><Sellers /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allow={['admin']}><Settings /></ProtectedRoute>} />

            <Route path="/seller" element={<ProtectedRoute allow={['seller']}><SellerHome /></ProtectedRoute>} />
            <Route path="/seller/sales" element={<ProtectedRoute allow={['seller']}><SellerSales /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
