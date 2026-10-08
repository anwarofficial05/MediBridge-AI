import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Shield,
  Sparkles,
  Stethoscope,
  User,
  UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LIVE_PERSONAS = [
  {
    role: 'DOCTOR',
    username: 'doctor',
    title: 'Dr. Priya Raman, MBBS, MD',
    specialty: 'Consultant Physician • Reg #84210',
    description: 'Access patient charts, SOAP note generator, and prescription safety interceptor.',
    badge: 'Live Clinician Portal',
    badgeColor: 'bg-cyan-500/10 text-cyan-700 border-cyan-300',
    icon: Stethoscope,
    gradient: 'from-cyan-600 to-teal-700',
    dest: '/doctor/dashboard',
  },
  {
    role: 'PATIENT',
    username: 'patient',
    title: 'Ravi Kumar (MB-P-1001)',
    specialty: '54 Yrs • Type 2 Diabetes • Penicillin Allergy',
    description: 'Access personal EHR timeline, emergency health card QR, and medication instructions.',
    badge: 'Live Patient Portal',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-300',
    icon: User,
    gradient: 'from-emerald-600 to-teal-700',
    dest: '/patient/dashboard',
  },
  {
    role: 'ADMIN',
    username: 'admin',
    title: 'Hospital Clinical Operations',
    specialty: 'System Administrator & Compliance',
    description: 'Audit logs, clinician credentialing, and multi-facility compliance metrics.',
    badge: 'Administrative Portal',
    badgeColor: 'bg-purple-500/10 text-purple-700 border-purple-300',
    icon: Shield,
    gradient: 'from-purple-600 to-indigo-700',
    dest: '/admin/dashboard',
  },
] as const;

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [username, setUsername] = useState('doctor');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'DOCTOR' | 'PATIENT' | 'ADMIN'>('DOCTOR');

  const handleLogin = async (targetUsername?: string, targetPassword?: string) => {
    const u = (targetUsername || username).trim();
    const p = targetPassword || password;
    if (!u) {
      setError('Please enter a username or patient ID.');
      return;
    }

    setError('');
    setBusy(true);
    try {
      const authUser = await login(u, p);
      if (authUser.role === 'PATIENT') nav('/patient/dashboard');
      else if (authUser.role === 'DOCTOR') nav('/doctor/dashboard');
      else nav('/admin/dashboard');
    } catch (e: any) {
      setError(e.message || 'Login failed. Please check credentials.');
    } finally {
      setBusy(false);
    }
  };

  const handleQuickLogin = async (persona: (typeof LIVE_PERSONAS)[number]) => {
    setUsername(persona.username);
    setPassword('demo123');
    setSelectedRole(persona.role);
    await handleLogin(persona.username, 'demo123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Top Brand Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-2 group">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500 text-slate-950 shadow-md group-hover:bg-cyan-400 transition">
              <Activity className="h-6 w-6 stroke-[2.5]" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">
              MediBridge <span className="text-cyan-400">AI</span>
            </span>
          </Link>
          <p className="text-xs sm:text-sm text-cyan-200/80 font-medium max-w-lg mx-auto">
            Ambient Clinical Intelligence, Multilingual Doctor-Patient Copilot & Multi-Drug Safety Matrix
          </p>
        </div>

        {/* Main Split Grid Card */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 backdrop-blur-xl shadow-2xl grid lg:grid-cols-12">
          {/* LEFT COLUMN: LIVE PERSONAS (Doctor & Patient 1-Click Launchers) */}
          <div className="lg:col-span-7 bg-slate-50/80 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-800">
                  Judges' 1-Click Role Switcher
                </span>
                <h2 className="text-lg font-black text-slate-900">Live Clinical Personas</h2>
              </div>
              <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-bold text-cyan-800 border border-cyan-200 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Zero-Typing Demo
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-5">
              Click any verified role below to log in immediately with pre-loaded electronic medical records:
            </p>

            <div className="space-y-3">
              {LIVE_PERSONAS.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedRole === p.role;
                return (
                  <div
                    key={p.role}
                    onClick={() => {
                      setSelectedRole(p.role);
                      setUsername(p.username);
                      setPassword('demo123');
                    }}
                    className={`group relative rounded-2xl border p-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-500 bg-white shadow-md ring-2 ring-cyan-400/20'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${p.gradient} text-white shadow-sm`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-slate-900 group-hover:text-cyan-800 transition">
                              {p.title}
                            </h3>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${p.badgeColor}`}
                            >
                              {p.badge}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-slate-600">{p.specialty}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickLogin(p);
                        }}
                        disabled={busy}
                        className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap shadow-xs flex items-center gap-1"
                      >
                        {busy && username === p.username ? (
                          'Launching...'
                        ) : (
                          <>
                            Log In <ArrowRight className="h-3 w-3" />
                          </>
                        )}
                      </button>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Username: <code className="font-mono font-bold text-slate-800">{p.username}</code>
                      </span>
                      <span>Password: <code className="font-mono text-slate-600">demo123</code></span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Supabase Cloud Database Badge */}
            <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 text-xs text-emerald-950 flex items-center gap-2.5">
              <Database className="h-4 w-4 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold text-emerald-900">Live PostgreSQL Database Active: </span>
                <span className="text-emerald-800">
                  Backed by live Supabase cloud database (`szdovfcrwypgwpzwnicz`). Real multi-tenant data persistence!
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: MANUAL USERNAME LOGIN FORM */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-100 text-cyan-800">
                  <KeyRound className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Account Sign In</h2>
              </div>
              <p className="text-xs text-slate-500 mb-5">
                Sign in using your <strong>Username</strong>, Patient Code, or registered credentials.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label text-xs flex items-center justify-between">
                    <span>Username or Patient ID</span>
                    <span className="text-[10px] text-slate-400 font-normal">e.g. doctor, patient, admin</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      className="input pl-9 text-xs font-medium"
                      type="text"
                      placeholder="Enter username (doctor, patient, admin)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label text-xs flex items-center justify-between">
                    <span>Password</span>
                    <span className="text-[10px] text-cyan-700 font-semibold">Demo: demo123</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      className="input pl-9 pr-9 text-xs"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary w-full py-2.5 text-xs font-bold shadow-md flex items-center justify-center gap-2"
                >
                  {busy ? 'Authenticating with Database...' : 'Sign In with Username'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            {/* Quick Helper Credentials */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <div className="text-[11px] text-slate-500 mb-2 font-medium">
                Seeded Demo Logins:
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setUsername('doctor');
                    setPassword('demo123');
                  }}
                  className="rounded-lg bg-slate-100 px-2 py-1 font-mono font-bold text-slate-700 hover:bg-slate-200"
                >
                  doctor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('patient');
                    setPassword('demo123');
                  }}
                  className="rounded-lg bg-slate-100 px-2 py-1 font-mono font-bold text-slate-700 hover:bg-slate-200"
                >
                  patient
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('admin');
                    setPassword('demo123');
                  }}
                  className="rounded-lg bg-slate-100 px-2 py-1 font-mono font-bold text-slate-700 hover:bg-slate-200"
                >
                  admin
                </button>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                New user?{' '}
                <Link to="/register" className="font-bold text-cyan-800 hover:underline">
                  Create new patient account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
