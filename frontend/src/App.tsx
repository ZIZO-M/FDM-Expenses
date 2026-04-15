import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import LoginPage from './pages/auth/LoginPage';
import Dashboard from './pages/Dashboard';
import MyClaims from './pages/employee/MyClaims';
import NewClaim from './pages/employee/NewClaim';
import EditClaim from './pages/employee/EditClaim';
import ClaimDetails from './pages/employee/ClaimDetails';
import PendingClaims from './pages/manager/PendingClaims';
import ClaimReview from './pages/manager/ClaimReview';
import ApprovedClaims from './pages/finance/ApprovedClaims';
import ReimbursementProcessing from './pages/finance/ReimbursementProcessing';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/unauthorized" element={
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p>You don't have permission to view this page.</p>
        </div>
      } />

      {/* Dashboard */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      } />

      {/* Employee */}
      <Route path="/employee/claims" element={
        <ProtectedRoute><Layout><MyClaims /></Layout></ProtectedRoute>
      } />
      <Route path="/employee/claims/new" element={
        <ProtectedRoute><Layout><NewClaim /></Layout></ProtectedRoute>
      } />
      <Route path="/employee/claims/:claimId/edit" element={
        <ProtectedRoute><Layout><EditClaim /></Layout></ProtectedRoute>
      } />
      <Route path="/employee/claims/:claimId" element={
        <ProtectedRoute><Layout><ClaimDetails /></Layout></ProtectedRoute>
      } />

      {/* Manager */}
      <Route path="/manager/claims" element={
        <ProtectedRoute roles={['LINE_MANAGER', 'FINANCE_OFFICER']}>
          <Layout><PendingClaims /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/manager/claims/:claimId" element={
        <ProtectedRoute roles={['LINE_MANAGER', 'FINANCE_OFFICER']}>
          <Layout><ClaimReview /></Layout>
        </ProtectedRoute>
      } />

      {/* Finance */}
      <Route path="/finance/claims" element={
        <ProtectedRoute roles={['FINANCE_OFFICER']}>
          <Layout><ApprovedClaims /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/finance/claims/:claimId" element={
        <ProtectedRoute roles={['FINANCE_OFFICER']}>
          <Layout><ReimbursementProcessing /></Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
