import { Activity, AlertTriangle, CalendarDays, CheckCircle2, FileText, Languages, Mic2, Pill, Plus, Stethoscope, TestTube2, QrCode } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import AppShell from '../layouts/AppShell';
import PageHeader from '../components/PageHeader';
import PatientTabs from '../components/PatientTabs';
import Disclaimer from '../components/Disclaimer';
import EmergencyHealthCardModal from '../components/EmergencyHealthCardModal';
import { api, apiBlob } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { Patient } from '../types';

export default function PatientProfile(){
  const {id=''}=useParams();
  const [params]=useSearchParams();
  const tab=params.get('tab')||'overview';
  const {user}=useAuth();
  const [p,setP]=useState<Patient|null>(null);
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState('');
  const [error,setError]=useState('');
  const [showCard,setShowCard]=useState(false);

  const load=()=>{
    setLoading(true); setError('');
    api<Patient>(`/patients/${id}`).then(setP).catch((e:any)=>setError(e.message)).finally(()=>setLoading(false));
  };
  useEffect(load,[id]);

  if(loading)return <AppShell><div className="text-slate-500">Loading patient record…</div></AppShell>;
  if(error)return <AppShell><div className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</div></AppShell>;
  if(!p)return <AppShell><div>Patient not found.</div></AppShell>;

  return <AppShell>
    <PageHeader eyebrow="Unified patient view" title={p.name} text={`${p.patientCode} • ${p.age||'Age not recorded'}${p.gender?` • ${p.gender}`:''} • Preferred language: ${p.preferredLanguage}`} action={
      <div className="flex items-center gap-2">
        <button onClick={()=>setShowCard(true)} className="btn-secondary text-xs flex items-center gap-1.5 border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100">
          <QrCode className="h-4 w-4" /> Emergency QR Pass
        </button>
        <span className="badge">Synthetic demo patient</span>
      </div>
    }/>
    {showCard && <EmergencyHealthCardModal patientId={p.id} onClose={()=>setShowCard(false)} />}
    <PatientTabs id={p.id}/>
    {tab==='overview'&&<Overview p={p}/>} 
    {tab==='voice'&&<VoiceSessions p={p} onDone={()=>{load();setMsg('Voice session approved and added to the EHR.')}}/>}
    {tab==='documents'&&<Documents p={p}/>} 
    {tab==='consultations'&&<Consultations p={p}/>} 
    {tab==='medications'&&<Medications p={p}/>} 
    {tab==='labs'&&<Labs p={p}/>} 
    {(user?.role==='DOCTOR'||user?.role==='ADMIN')&&<DoctorActions id={p.id} onDone={()=>{load();setMsg('Patient record updated.')}}/>}
    {msg&&<div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</div>}
  </AppShell>
}

function Overview({p}:{p:Patient}){
  const last=p.consultations?.[0];
  return <>
    <Disclaimer/>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Info icon={Languages} label="Language" value={p.preferredLanguage}/><Info icon={AlertTriangle} label="Allergies" value={p.allergies?.map((x:any)=>x.substance).join(', ')||'None recorded'}/><Info icon={Pill} label="Current medicines" value={p.patientMedications?.filter((x:any)=>x.status==='ACTIVE').map((x:any)=>x.medication.name).join(', ')||'None recorded'}/><Info icon={CalendarDays} label="Last consultation" value={last?new Date(last.consultationDate).toLocaleDateString('en-IN'):'None recorded'}/></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Card title="Existing conditions" icon={Activity}>{p.diagnoses?.length?p.diagnoses.map((x:any)=><Row key={x.id} title={x.name} sub={`${x.status} • ${x.source.replaceAll('_',' ')}`}/>):<Empty/>}</Card>
      <Card title="Recent symptoms" icon={Stethoscope}>{p.symptoms?.length?p.symptoms.slice(0,6).map((x:any)=><Row key={x.id} title={x.name} sub={[x.duration,x.severity].filter(Boolean).join(' • ')||'No details'}/>):<Empty/>}</Card>
      <Card title="Recent lab results" icon={TestTube2}>{p.labResults?.length?p.labResults.slice(0,6).map((x:any)=><Row key={x.id} title={x.labTest.name} sub={`${x.value}${x.unit?` ${x.unit}`:''} • ${new Date(x.resultDate).toLocaleDateString('en-IN')}`}/>):<Empty/>}</Card>
      <Card title="Recent documents" icon={FileText}>{p.medicalDocuments?.length?p.medicalDocuments.slice(0,6).map((x:any)=><Row key={x.id} title={x.originalName} sub={`${x.documentType.replaceAll('_',' ')} • ${x.status.replaceAll('_',' ')}`}/>):<Empty/>}</Card>
    </div>
  </>;
}

function VoiceSessions({p,onDone}:{p:Patient;onDone:()=>void}){
  const {user}=useAuth();
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const approve=async(id:string)=>{
    setBusy(id); setError('');
    try{await api(`/voice/${id}/approve`,{method:'POST'});onDone()}catch(e:any){setError(e.message)}finally{setBusy('')}
  };
  return <section className="card p-5">
    <div className="mb-3 flex items-center gap-2"><Mic2 className="h-5 w-5 text-cyan-700"/><h2 className="font-bold">Voice sessions</h2></div>
    {error&&<div className="mb-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    <div className="divide-y divide-slate-100">{p.voiceSessions?.length?p.voiceSessions.map((x:any)=>{
      const e=x.extracted||{};
      const summary=[...(e.symptoms||[]).map((v:any)=>v.name),...(e.conditions||[]).map((v:any)=>v.name),...(e.medications||[]).map((v:any)=>v.name),...(e.allergies||[]).map((v:any)=>`Allergy: ${v.substance}`)].filter(Boolean).join(', ');
      return <div key={x.id} className="py-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-slate-900">{x.language} voice session</span><span className={x.approved?'rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700':'rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800'}>{x.approved?'Clinician approved':'Pending review'}</span></div><div className="mt-1 text-xs text-slate-500">{new Date(x.createdAt).toLocaleString('en-IN')}</div><div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{x.transcript}</div><div className="mt-2 text-xs text-slate-500"><b>Extracted:</b> {summary||'No structured items extracted'}</div></div>{!x.approved&&(user?.role==='DOCTOR'||user?.role==='ADMIN')&&<button disabled={!!busy} onClick={()=>approve(x.id)} className="btn-primary shrink-0"><CheckCircle2 className="h-4 w-4"/>{busy===x.id?'Approving…':'Approve to EHR'}</button>}</div></div>;
    }):<Empty/>}</div>
  </section>;
}

function Documents({p}:{p:Patient}){
  const [error,setError]=useState('');
  const [opening,setOpening]=useState('');
  const openFile=async(id:string)=>{
    setOpening(id); setError('');
    try{
      const blob=await apiBlob(`/documents/${id}/file`);
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=url; anchor.target='_blank'; anchor.rel='noopener noreferrer'; anchor.click();
      window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e:any){setError(e.message)}finally{setOpening('')}
  };
  return <section className="card p-5"><div className="mb-3 flex items-center gap-2"><FileText className="h-5 w-5 text-cyan-700"/><h2 className="font-bold">Medical documents</h2></div>{error&&<div className="mb-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<div className="divide-y divide-slate-100">{p.medicalDocuments?.length?p.medicalDocuments.map((x:any)=><div key={x.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-semibold text-slate-900">{x.originalName}</div><div className="mt-1 text-xs leading-5 text-slate-500">{`${x.documentType.replaceAll('_',' ')} • ${x.status.replaceAll('_',' ')} • ${new Date(x.uploadedAt).toLocaleDateString('en-IN')}`}</div></div><button className="btn-secondary shrink-0" disabled={!!opening || x.fileAvailable===false} onClick={()=>openFile(x.id)}>{x.fileAvailable===false?'Original unavailable':opening===x.id?'Opening…':'View original'}</button></div>):<Empty/>}</div></section>;
}

function Consultations({p}:{p:Patient}){return <Card title="Consultations" icon={Stethoscope}>{p.consultations?.length?p.consultations.map((x:any)=><Row key={x.id} title={x.chiefComplaint||'Consultation'} sub={`${new Date(x.consultationDate).toLocaleDateString('en-IN')}${x.doctor?.user?.name?` • ${x.doctor.user.name}`:''}${x.clinicalNotes?` • ${x.clinicalNotes}`:''}`}/>):<Empty/>}</Card>}
function Medications({p}:{p:Patient}){return <Card title="Medication history" icon={Pill}>{p.patientMedications?.length?p.patientMedications.map((x:any)=><Row key={x.id} title={x.medication.name} sub={`${x.status}${x.dosage?` • ${x.dosage}`:''}${x.frequency?` • ${x.frequency}`:''}${x.duration?` • ${x.duration}`:''} • ${x.source.replaceAll('_',' ')}`}/>):<Empty/>}</Card>}
function Labs({p}:{p:Patient}){return <Card title="Lab results" icon={TestTube2}>{p.labResults?.length?p.labResults.map((x:any)=><Row key={x.id} title={x.labTest.name} sub={`${x.value}${x.unit?` ${x.unit}`:''}${x.referenceRange?` • Ref: ${x.referenceRange}`:''} • ${new Date(x.resultDate).toLocaleDateString('en-IN')}`}/>):<Empty/>}</Card>}

function DoctorActions({id,onDone}:{id:string;onDone:()=>void}){
  const [form,setForm]=useState({consultation:'',diagnosis:'',medication:'',dosage:'',frequency:'',allergy:'',reaction:'',severity:'',lab:'',value:'',unit:''});
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const send=async(kind:string,path:string,body:any)=>{
    setBusy(kind);setError('');
    try{await api(`/patients/${id}/${path}`,{method:'POST',body:JSON.stringify(body)});onDone();setForm(prev=>({...prev,[kind]:''}))}
    catch(e:any){setError(e.message)}finally{setBusy('')}
  };
  return <div className="card mt-6 p-5"><div className="mb-4 flex items-center gap-2"><Plus className="h-5 w-5 text-cyan-700"/><h2 className="font-bold">Clinician record actions</h2></div>{error&&<div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<div className="grid gap-4 lg:grid-cols-2">
    <Action title="Add clinical note"><textarea className="input min-h-24" placeholder="Clinical note" value={form.consultation} onChange={e=>setForm({...form,consultation:e.target.value})}/><button className="btn-primary mt-2" disabled={!form.consultation||!!busy} onClick={()=>send('consultation','consultations',{clinicalNotes:form.consultation})}>Save note</button></Action>
    <Action title="Add diagnosis"><input className="input" placeholder="Doctor-recorded diagnosis" value={form.diagnosis} onChange={e=>setForm({...form,diagnosis:e.target.value})}/><button className="btn-primary mt-2" disabled={!form.diagnosis||!!busy} onClick={()=>send('diagnosis','diagnoses',{name:form.diagnosis})}>Save diagnosis</button></Action>
    <Action title="Add medication"><div className="grid gap-2 sm:grid-cols-3"><input className="input" placeholder="Medication" value={form.medication} onChange={e=>setForm({...form,medication:e.target.value})}/><input className="input" placeholder="Dosage" value={form.dosage} onChange={e=>setForm({...form,dosage:e.target.value})}/><input className="input" placeholder="Frequency" value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})}/></div><button className="btn-primary mt-2" disabled={!form.medication||!!busy} onClick={()=>send('medication','medications',{name:form.medication,dosage:form.dosage,frequency:form.frequency})}>Save medication</button></Action>
    <Action title="Add allergy"><div className="grid gap-2 sm:grid-cols-3"><input className="input" placeholder="Substance" value={form.allergy} onChange={e=>setForm({...form,allergy:e.target.value})}/><input className="input" placeholder="Reaction" value={form.reaction} onChange={e=>setForm({...form,reaction:e.target.value})}/><input className="input" placeholder="Severity" value={form.severity} onChange={e=>setForm({...form,severity:e.target.value})}/></div><button className="btn-primary mt-2" disabled={!form.allergy||!!busy} onClick={()=>send('allergy','allergies',{substance:form.allergy,reaction:form.reaction,severity:form.severity})}>Save allergy</button></Action>
    <Action title="Add lab result"><div className="grid gap-2 sm:grid-cols-3"><input className="input" placeholder="Lab test" value={form.lab} onChange={e=>setForm({...form,lab:e.target.value})}/><input className="input" placeholder="Value" value={form.value} onChange={e=>setForm({...form,value:e.target.value})}/><input className="input" placeholder="Unit" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></div><button className="btn-primary mt-2" disabled={!form.lab||!form.value||!!busy} onClick={()=>send('lab','labs',{name:form.lab,value:form.value,unit:form.unit})}>Save lab result</button></Action>
  </div></div>;
}

function Info({icon:Icon,label,value}:any){return <div className="card p-5"><Icon className="h-5 w-5 text-cyan-700"/><div className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-sm font-semibold text-slate-800">{value}</div></div>}
function Card({title,icon:Icon,children}:any){return <section className="card p-5"><div className="mb-3 flex items-center gap-2"><Icon className="h-5 w-5 text-cyan-700"/><h2 className="font-bold">{title}</h2></div><div className="divide-y divide-slate-100">{children}</div></section>}
function Row({title,sub}:{title:string;sub:string}){return <div className="py-3"><div className="text-sm font-semibold text-slate-900">{title}</div><div className="mt-1 text-xs leading-5 text-slate-500">{sub}</div></div>}
function Empty(){return <div className="py-8 text-center text-sm text-slate-400">No records available.</div>}
function Action({title,children}:{title:string;children:ReactNode}){return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 text-sm font-bold text-slate-700">{title}</div>{children}</div>}
