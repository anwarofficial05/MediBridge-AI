import { Activity, BrainCircuit, FileUp, LayoutDashboard, LogOut, Network, Stethoscope, UserRound, Users, Clock3 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const base = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition';
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const nav = user?.role === 'PATIENT' ? [
    ['/patient/dashboard', LayoutDashboard, 'Dashboard'], ['/voice-consultation', BrainCircuit, 'Voice Consultation'], ['/document-upload', FileUp, 'Document Upload'],
  ] : user?.role === 'DOCTOR' ? [
    ['/doctor/dashboard', LayoutDashboard, 'Doctor Dashboard'], ['/voice-consultation', BrainCircuit, 'Voice Tool'], ['/document-upload', FileUp, 'Document Review'],
  ] : [['/admin/dashboard', LayoutDashboard, 'Admin Dashboard'], ['/doctor/dashboard', Users, 'Patients']];
  return <div className="min-h-screen lg:flex">
    <aside className="border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex h-16 items-center gap-3 px-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-700 text-white"><Activity className="h-5 w-5"/></div><div><div className="font-bold text-slate-900">MediBridge AI</div><div className="text-xs text-slate-500">Clinical documentation</div></div></div>
      <nav className="flex gap-2 overflow-auto px-3 pb-3 lg:block lg:space-y-1 lg:pb-0">
        {nav.map(([to, Icon, label]: any) => <NavLink key={to} to={to} className={({isActive}) => `${base} ${isActive ? 'bg-cyan-50 text-cyan-800' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-4 w-4"/><span className="whitespace-nowrap">{label}</span></NavLink>)}
      </nav>
      <div className="hidden border-t border-slate-100 p-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block"><div className="mb-3 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"><UserRound className="h-4 w-4"/></div><div className="min-w-0"><div className="truncate text-sm font-semibold">{user?.name}</div><div className="text-xs text-slate-500">{user?.role}</div></div></div><button onClick={logout} className="btn-secondary w-full"><LogOut className="h-4 w-4"/>Logout</button></div>
    </aside>
    <main className="min-w-0 flex-1 lg:ml-64"><div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div></main>
  </div>;
}
