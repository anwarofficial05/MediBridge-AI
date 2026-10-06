import { FileText, MessageSquareText, Search, Stethoscope, Users, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../layouts/AppShell';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { api } from '../services/api';
import type { Patient } from '../types';

export default function DoctorDashboard(){
  const [patients,setPatients]=useState<Patient[]>([]); const [stats,setStats]=useState<any>({}); const [q,setQ]=useState(''); const [loading,setLoading]=useState(true);
  const load=async(search='')=>{setLoading(true);try{const [p,s]=await Promise.all([api<Patient[]>(`/patients${search?`?q=${encodeURIComponent(search)}`:''}`),api('/stats/dashboard')]);setPatients(p);setStats(s)}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  return <AppShell><PageHeader eyebrow="Clinical workspace" title="Doctor Dashboard" text="Search synthetic demo patients, review longitudinal records, verify extracted data and generate documentation summaries."/>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><StatCard label="Patients" value={stats.patients??'—'} icon={Users}/><StatCard label="Consultations" value={stats.consultations??'—'} icon={Stethoscope}/><StatCard label="Documents" value={stats.documents??'—'} icon={FileText}/><StatCard label="Voice sessions" value={stats.voiceSessions??'—'} icon={MessageSquareText}/><StatCard label="Pending voice reviews" value={stats.pendingVoiceSessions??'—'} icon={ShieldAlert}/></div>
    <div className="card mt-6 overflow-hidden"><div className="border-b border-slate-100 p-4 sm:flex sm:items-center sm:justify-between"><div><h2 className="font-bold">Patient directory</h2><p className="mt-1 text-sm text-slate-500">Open a patient to view overview, timeline, graph, documents, medications, labs and AI summary.</p></div><form onSubmit={e=>{e.preventDefault();load(q)}} className="mt-3 flex gap-2 sm:mt-0"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input className="input pl-9" placeholder="Name or patient ID" value={q} onChange={e=>setQ(e.target.value)}/></div><button className="btn-secondary">Search</button></form></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Patient</th><th className="px-5 py-3">Language</th><th className="px-5 py-3">Conditions</th><th className="px-5 py-3">Current medication</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{loading?<tr><td className="px-5 py-6 text-slate-500" colSpan={5}>Loading…</td></tr>:patients.map(p=><tr key={p.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><div className="font-semibold text-slate-900">{p.name}</div><div className="text-xs text-slate-500">{p.patientCode} • {p.age||'—'} yrs • {p.gender||'—'}</div></td><td className="px-5 py-4"><span className="badge">{p.preferredLanguage}</span></td><td className="px-5 py-4 text-slate-600">{p.diagnoses?.map((x:any)=>x.name).join(', ')||'—'}</td><td className="px-5 py-4 text-slate-600">{p.patientMedications?.map((x:any)=>x.medication.name).join(', ')||'—'}</td><td className="px-5 py-4 text-right"><Link className="font-semibold text-cyan-700 hover:text-cyan-900" to={`/patients/${p.id}`}>Open record →</Link></td></tr>)}</tbody></table></div>
    </div>
  </AppShell>
}
