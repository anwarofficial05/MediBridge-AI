import { Activity, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', preferredLanguage: 'English' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      nav('/patient/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return <div className="grid min-h-screen place-items-center bg-slate-50 p-4">
    <div className="card w-full max-w-lg p-7">
      <Link to="/" className="mb-6 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-700 text-white"><Activity className="h-5 w-5"/></div><b>MediBridge AI</b></Link>
      <h1 className="text-2xl font-bold">Create patient account</h1>
      <div className="mt-3 flex gap-2 rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-xs leading-5 text-cyan-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/>Clinician accounts are created and verified by administrators. Public registration is limited to patients.</div>
      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label">Full name</label><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required maxLength={100}/></div>
        <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/></div>
        <div><label className="label">Password</label><input type="password" minLength={8} maxLength={128} className="input" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required/><div className="mt-1 text-xs text-slate-400">8+ characters with at least one letter and one number.</div></div>
        <div className="sm:col-span-2"><label className="label">Preferred language</label><select className="input" value={form.preferredLanguage} onChange={e=>setForm({...form,preferredLanguage:e.target.value})}>{['English','Tamil','Hindi','Telugu'].map(x=><option key={x}>{x}</option>)}</select></div>
        {error&&<div className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        <button className="btn-primary sm:col-span-2" disabled={busy}>{busy?'Creating account…':'Create patient account'}</button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">Already registered? <Link to="/login" className="font-semibold text-cyan-700">Sign in</Link></p>
    </div>
  </div>;
}
