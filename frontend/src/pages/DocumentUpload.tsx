import { CheckCircle2, FileImage, FileUp, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import AppShell from '../layouts/AppShell';
import PageHeader from '../components/PageHeader';
import Disclaimer from '../components/Disclaimer';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { Patient } from '../types';

type Notice = { kind: 'success' | 'error' | 'info'; text: string } | null;

export default function DocumentUpload(){
  const {user}=useAuth();
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [patients,setPatients]=useState<Patient[]>([]);
  const [patientId,setPatientId]=useState('');
  const [type,setType]=useState('PRESCRIPTION');
  const [docId,setDocId]=useState('');
  const [data,setData]=useState<any>(null);
  const [approved,setApproved]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState<Notice>(null);

  useEffect(()=>{(async()=>{
    try{
      if(user?.role==='PATIENT'){const p=await api<Patient>('/patients/me');setPatients([p]);setPatientId(p.id)}
      else{const ps=await api<Patient[]>('/patients');setPatients(ps);setPatientId(ps[0]?.id||'')}
    }catch(e:any){setNotice({kind:'error',text:e.message})}
  })()},[user]);

  useEffect(()=>{if(!file){setPreview('');return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);

  const pick=(next:File|null)=>{
    if(next&&!['application/pdf','image/jpeg','image/png','image/webp'].includes(next.type)){
      setNotice({kind:'error',text:'Choose a PDF, JPG, PNG or WEBP file.'}); return;
    }
    setFile(next); setData(null); setDocId(''); setApproved(false); setNotice(null);
  };

  const extract=async()=>{
    if(!file||!patientId)return;
    setBusy(true); setNotice(null);
    try{
      const fd=new FormData(); fd.append('document',file); fd.append('patientId',patientId); fd.append('documentType',type);
      const result=await api<any>('/documents/extract',{method:'POST',body:fd});
      setDocId(result.document.id); setData(result.extracted); setApproved(false);
      setNotice({kind:'info',text:'Mock extraction completed. Review and correct every field before clinician approval.'});
    }catch(e:any){setNotice({kind:'error',text:e.message})}finally{setBusy(false)}
  };

  const saveCorrections=async()=>{
    if(!docId||!data||approved)return;
    setBusy(true); setNotice(null);
    try{await api(`/documents/${docId}/extracted`,{method:'PUT',body:JSON.stringify(data)});setNotice({kind:'success',text:'Corrections saved. The document remains pending clinician review.'})}
    catch(e:any){setNotice({kind:'error',text:e.message})}finally{setBusy(false)}
  };

  const approve=async()=>{
    if(!docId||!data||approved)return;
    setBusy(true); setNotice(null);
    try{await api(`/documents/${docId}/approve`,{method:'POST',body:JSON.stringify({extracted:data})});setApproved(true);setNotice({kind:'success',text:'Approved. Verified diagnoses, medications, lab results and allergies were added to the patient EHR.'})}
    catch(e:any){setNotice({kind:'error',text:e.message})}finally{setBusy(false)}
  };

  return <AppShell><PageHeader eyebrow="Document → structured record" title="Medical Document Intelligence" text="Upload a synthetic prescription, lab report, discharge summary, consultation report or medical certificate. Mock OCR keeps the demo fully local and deterministic."/>
    <Disclaimer/>
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 p-5"><div className="grid gap-3 sm:grid-cols-2"><div><label className="label">Patient</label><select className="input" value={patientId} disabled={user?.role==='PATIENT'} onChange={e=>setPatientId(e.target.value)}>{patients.map(p=><option key={p.id} value={p.id}>{p.name} • {p.patientCode}</option>)}</select></div><div><label className="label">Document type</label><select className="input" value={type} onChange={e=>setType(e.target.value)}>{['PRESCRIPTION','LAB_REPORT','DISCHARGE_SUMMARY','CONSULTATION_REPORT','MEDICAL_CERTIFICATE','OTHER'].map(x=><option key={x}>{x.replaceAll('_',' ')}</option>)}</select></div></div></div>
        <div className="p-5"><label className="grid min-h-24 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center hover:border-cyan-300"><input className="hidden" type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={e=>pick(e.target.files?.[0]||null)}/><div><FileUp className="mx-auto h-7 w-7 text-cyan-700"/><div className="mt-2 text-sm font-semibold">Choose PDF or image</div><div className="mt-1 text-xs text-slate-500">PDF, JPG, PNG, WEBP • server validates MIME and file signature</div></div></label>
          {file&&<div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div className="min-w-0"><div className="truncate text-sm font-semibold">{file.name}</div><div className="text-xs text-slate-500">{Math.ceil(file.size/1024)} KB</div></div><button onClick={extract} disabled={busy} className="btn-primary">{busy?'Extracting…':'Extract'}</button></div>}
          <div className="mt-4 min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">{!preview?<div className="grid h-[420px] place-items-center text-slate-400"><div className="text-center"><FileImage className="mx-auto h-8 w-8"/><div className="mt-2 text-sm">Original document preview</div></div></div>:file?.type==='application/pdf'?<iframe className="h-[520px] w-full bg-white" src={preview} title="Document preview"/>:<img className="h-[520px] w-full object-contain" src={preview} alt="Document preview"/>}</div>
        </div>
      </section>
      <section className="card p-5"><div className="mb-5"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">AI Extracted Information</h2>{approved&&<span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Approved & locked</span>}</div><p className="mt-1 text-xs text-slate-500">Edit any incorrect field before saving or clinician approval. Approved extractions are locked against later edits.</p></div>
        {!data?<div className="grid min-h-[520px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">Upload and extract a document to populate this panel.</div>:<fieldset disabled={approved} className="space-y-4 disabled:opacity-70">
          <div className="grid gap-3 sm:grid-cols-2">{[['Patient name','patientName'],['Doctor name','doctorName'],['Hospital','hospital'],['Date','date'],['Follow-up date','followUpDate']].map(([label,key])=><Field key={key} label={label} value={data[key]||''} set={(v)=>setData({...data,[key]:v})}/>)}</div>
          <ListEditor title="Diagnoses recorded in document" items={(data.diagnosisRecorded||[]).map((x:string)=>({name:x}))} fields={['name']} onChange={(v:any[])=>setData({...data,diagnosisRecorded:v.map(x=>x.name).filter(Boolean)})}/>
          <ListEditor title="Medicines" items={data.medicines||[]} fields={['name','dosage','frequency','duration']} onChange={(v)=>setData({...data,medicines:v})}/>
          <ListEditor title="Lab tests" items={data.labTests||[]} fields={['name','value','unit','referenceRange']} onChange={(v)=>setData({...data,labTests:v})}/>
          <ListEditor title="Allergies" items={data.allergies||[]} fields={['substance','reaction']} onChange={(v)=>setData({...data,allergies:v})}/>
          <div><label className="label">Extraction note</label><textarea className="input min-h-20" value={data.note||''} onChange={e=>setData({...data,note:e.target.value})}/></div>
          {!approved&&<div className="flex flex-wrap gap-2"><button type="button" onClick={saveCorrections} disabled={busy} className="btn-secondary"><Save className="h-4 w-4"/>Save corrections</button>{user?.role!=='PATIENT'&&<button type="button" onClick={approve} disabled={busy} className="btn-primary"><CheckCircle2 className="h-4 w-4"/>Approve & Save</button>}</div>}
        </fieldset>}
        {notice&&<div className={`mt-4 rounded-xl p-3 text-sm ${notice.kind==='success'?'bg-emerald-50 text-emerald-800':notice.kind==='error'?'bg-rose-50 text-rose-700':'bg-slate-50 text-slate-700'}`}>{notice.text}</div>}
      </section>
    </div>
  </AppShell>
}
function Field({label,value,set}:{label:string;value:string;set:(v:string)=>void}){return <div><label className="label">{label}</label><input className="input" value={value} onChange={e=>set(e.target.value)}/></div>}
function ListEditor({title,items,fields,onChange}:{title:string;items:any[];fields:string[];onChange:(v:any[])=>void}){const update=(i:number,k:string,v:string)=>onChange(items.map((x,j)=>j===i?{...x,[k]:v}:x));const remove=(i:number)=>onChange(items.filter((_,j)=>j!==i));return <div><div className="mb-2 flex items-center justify-between"><div className="text-sm font-semibold">{title}</div><button type="button" className="text-xs font-semibold text-cyan-700" onClick={()=>onChange([...items,Object.fromEntries(fields.map(f=>[f,'']))])}>+ Add</button></div><div className="space-y-2">{items.length===0?<div className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-400">No entries extracted</div>:items.map((item,i)=><div key={i} className="rounded-xl border border-slate-200 p-3"><div className="grid gap-2 sm:grid-cols-2">{fields.map(f=><input key={f} className="input" placeholder={f} value={item[f]||''} onChange={e=>update(i,f,e.target.value)}/>)}</div><button type="button" onClick={()=>remove(i)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><Trash2 className="h-3.5 w-3.5"/>Remove</button></div>)}</div></div>}
