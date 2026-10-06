import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

export default function ProtectedRoute({ roles, children }: { roles?: UserRole[]; children: React.ReactNode }) {
  const { user, loading } = useAuth(); const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-500">Loading MediBridge AI…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === 'PATIENT' ? '/patient/dashboard' : user.role === 'DOCTOR' ? '/doctor/dashboard' : '/admin/dashboard'} replace />;
  return <>{children}</>;
}
