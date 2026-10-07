import { FileText, MessageSquareText, ShieldCheck, Stethoscope, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppShell from '../layouts/AppShell';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { api } from '../services/api';

export default function AdminDashboard(){
  const [d,setD]=useState<any>({totals:{},languageUsage:[]});
  const [form,setForm]=useState({name:'',email:'',password:'',specialization:'General Medicine',registrationNo:''});
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const load=()=>api('/stats/admin').then(setD).catch((e:any)=>setError(e.message));
  useEffect(() => { load(); }, []);

  const createClinician=async(e:React.FormEvent)=>{
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try{
      await api('/auth/clinicians',{method:'POST',body:JSON.stringify(form)});
      setNotice('Clinician account created successfully.');
      setForm({name:'',email:'',password:'',specialization:'General Medicine',registrationNo:''});
      load();
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  };

  return <AppShell>
    <PageHeader eyebrow="Prototype operations" title="Admin Dashboard" text="Usage overview plus controlled clinician-account provisioning for the research prototype."/>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><StatCard label="Patients" value={d.totals.patients??'—'} icon={Users}/><StatCard label="Doctors" value={d.totals.doctors??'—'} icon={Stethoscope}/><StatCard label="Consultations" value={d.totals.consultations??'—'} icon={Stethoscope}/><StatCard label="Documents" value={d.totals.documents??'—'} icon={FileText}/><StatCard label="Voice consultations" value={d.totals.voiceSessions??'—'} icon={MessageSquareText}/></div>
    {error&&<div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    {notice&&<div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <div className="card p-5"><h2 className="font-bold">Language usage</h2><p className="mt-1 text-sm text-slate-500">Based on saved voice sessions.</p><div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.languageUsage}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="language"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="#0e7490" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></div></div>
      <section className="card p-5"><div className="mb-4 flex items-start gap-3"><div className="rounded-xl bg-cyan-50 p-2.5 text-cyan-700"><UserPlus className="h-5 w-5"/></div><div><h2 className="font-bold">Create clinician account</h2><p className="mt-1 text-xs leading-5 text-slate-500">Doctor accounts can no longer be self-registered. Only an authenticated admin can provision them.</p></div></div>
        <form onSubmit={createClinician} className="space-y-3">
          <div><label className="label">Clinician name</label><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></div>
          <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/></div>
          <div><label className="label">Temporary password</label><input className="input" type="password" minLength={8} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required/><div className="mt-1 text-xs text-slate-400">Use 8+ characters with at least one letter and number.</div></div>
          <div><label className="label">Specialization</label><input className="input" value={form.specialization} onChange={e=>setForm({...form,specialization:e.target.value})} required/></div>
          <div><label className="label">Registration number (optional)</label><input className="input" value={form.registrationNo} onChange={e=>setForm({...form,registrationNo:e.target.value})}/></div>
          <button className="btn-primary w-full" disabled={busy}><ShieldCheck className="h-4 w-4"/>{busy?'Creating…':'Create verified clinician'}</button>
        </form>
      </section>
    </div>
  </AppShell>
}
