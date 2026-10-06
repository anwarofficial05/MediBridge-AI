import { Activity, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const demos = [
  ['Patient','patient@medibridge.ai'], ['Doctor','doctor@medibridge.ai'], ['Admin','admin@medibridge.ai']
] as const;
export default function LoginPage() {
  const { login } = useAuth(); const nav = useNavigate();
  const [email,setEmail] = useState('doctor@medibridge.ai'); const [password,setPassword] = useState('demo123'); const [error,setError] = useState(''); const [busy,setBusy] = useState(false);
  const submit = async (e:React.FormEvent) => { e.preventDefault(); setError(''); setBusy(true); try { const u=await login(email,password); nav(u.role==='PATIENT'?'/patient/dashboard':u.role==='DOCTOR'?'/doctor/dashboard':'/admin/dashboard'); } catch(e:any){setError(e.message)} finally{setBusy(false)} };
  return <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950 p-4"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-7 shadow-2xl"><Link to="/" className="mb-7 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-700 text-white"><Activity className="h-5 w-5"/></div><div><div className="font-bold text-slate-900">MediBridge AI</div><div className="text-xs text-slate-500">Secure prototype access</div></div></Link><h1 className="text-2xl font-bold">Welcome back</h1><p className="mt-2 text-sm text-slate-500">Use a seeded demo role or your registered account.</p><form onSubmit={submit} className="mt-6 space-y-4"><div><label className="label">Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div><label className="label">Password</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>{error&&<div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<button className="btn-primary w-full" disabled={busy}>{busy?'Signing in…':'Sign in'}<ArrowRight className="h-4 w-4"/></button></form><div className="mt-6"><div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Demo accounts • password: demo123</div><div className="grid grid-cols-3 gap-2">{demos.map(([role,mail])=><button key={role} onClick={()=>{setEmail(mail);setPassword('demo123')}} className="rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold hover:bg-slate-50">{role}</button>)}</div></div><p className="mt-6 text-center text-sm text-slate-500">New user? <Link to="/register" className="font-semibold text-cyan-700">Create account</Link></p></div></div>;
}
