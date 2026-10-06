import { AlertTriangle, CheckCircle2, Mic2, Save, Sparkles, Square, Trash2, WandSparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppShell from '../layouts/AppShell';
import PageHeader from '../components/PageHeader';
import Disclaimer from '../components/Disclaimer';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { Extraction, Patient } from '../types';

const langCodes: Record<string,string> = { Tamil:'ta-IN', English:'en-IN', Hindi:'hi-IN', Telugu:'te-IN' };
const sample = 'Enakku moonu naala fever irukku. Inniki moochu vida konjam kashtama irukku. Enakku sugar irukku. Metformin tablet sapidren.';

type Notice = { kind: 'success' | 'error' | 'info'; text: string } | null;

export default function VoiceConsultation(){
  const {user}=useAuth();
  const [language,setLanguage]=useState('Tamil');
  const [text,setText]=useState(sample);
  const [interimText,setInterimText]=useState('');
  const [speechConfidence,setSpeechConfidence]=useState<number|null>(null);
  const [speechError,setSpeechError]=useState('');
  const [extraction,setExtraction]=useState<Extraction|null>(null);
  const [analyzedText,setAnalyzedText]=useState('');
  const [analyzedLanguage,setAnalyzedLanguage]=useState('');
  const [listening,setListening]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState<Notice>(null);
  const [patients,setPatients]=useState<Patient[]>([]);
  const [patientId,setPatientId]=useState('');
  const [answers,setAnswers]=useState<Record<number,string>>({});
  const recognitionRef=useRef<any>(null);
  const processedFinalIndexesRef=useRef<Set<number>>(new Set());

  useEffect(()=>{(async()=>{
    try {
      if(user?.role==='PATIENT'){
        const p=await api<Patient>('/patients/me'); setPatientId(p.id); setPatients([p]);
      } else {
        const ps=await api<Patient[]>('/patients'); setPatients(ps); setPatientId(ps[0]?.id||'');
      }
    } catch(e:any) { setNotice({kind:'error',text:e.message}); }
  })()},[user]);

  useEffect(()=>()=>{try{recognitionRef.current?.abort?.()}catch{}},[]);

  const supported=useMemo(()=>typeof window!=='undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),[]);
  const secureContext=typeof window==='undefined' || window.isSecureContext || window.location.hostname==='localhost';
  const extractionStale=Boolean(extraction && (text.trim()!==analyzedText || language!==analyzedLanguage));

  const stopSpeech=()=>{
    try { recognitionRef.current?.stop?.(); } catch {}
    setListening(false);
    setInterimText('');
  };

  const startSpeech=()=>{
    if(!supported){setSpeechError('Speech recognition is not supported in this browser. Use manual text input.');return;}
    if(!secureContext){setSpeechError('Microphone speech recognition requires HTTPS (or localhost).');return;}
    if(listening)return;

    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    const recognition=new SR();
    recognition.lang=langCodes[language];
    recognition.interimResults=true;
    recognition.continuous=true;
    recognition.maxAlternatives=1;
    processedFinalIndexesRef.current=new Set();
    setSpeechError('');
    setInterimText('');
    setSpeechConfidence(null);

    recognition.onstart=()=>setListening(true);
    recognition.onresult=(event:any)=>{
      const finalChunks:string[]=[];
      const interimChunks:string[]=[];
      const confidenceValues:number[]=[];
      for(let i=event.resultIndex;i<event.results.length;i++){
        const result=event.results[i];
        const alternative=result?.[0];
        const transcript=String(alternative?.transcript||'').trim();
        if(!transcript)continue;
        if(result.isFinal){
          if(processedFinalIndexesRef.current.has(i))continue;
          processedFinalIndexesRef.current.add(i);
          finalChunks.push(transcript);
          if(typeof alternative.confidence==='number' && alternative.confidence>0) confidenceValues.push(alternative.confidence);
        } else {
          interimChunks.push(transcript);
        }
      }
      if(finalChunks.length){
        setText(prev=>`${prev.trim()}${prev.trim()?' ':''}${finalChunks.join(' ')}`.trim());
      }
      setInterimText(interimChunks.join(' '));
      if(confidenceValues.length){
        setSpeechConfidence(confidenceValues.reduce((a,b)=>a+b,0)/confidenceValues.length);
      }
    };
    recognition.onerror=(event:any)=>{
      const code=String(event?.error||'unknown');
      const messages:Record<string,string>={
        'not-allowed':'Microphone permission was denied. Allow microphone access or use manual text input.',
        'service-not-allowed':'Speech recognition service is not allowed in this browser.',
        'audio-capture':'No working microphone was detected.',
        'no-speech':'No speech was detected. Try again and speak closer to the microphone.',
        'network':'Speech recognition had a network/service error. You can continue with manual text input.',
        'aborted':'Speech recognition stopped.',
      };
      if(code!=='aborted')setSpeechError(messages[code]||`Speech recognition error: ${code}`);
      setListening(false);
      setInterimText('');
    };
    recognition.onend=()=>{
      setListening(false);
      setInterimText('');
      recognitionRef.current=null;
    };

    recognitionRef.current=recognition;
    try { recognition.start(); } catch { setSpeechError('Unable to start speech recognition. Please try again.'); }
  };

  const analyze=async()=>{
    if(listening)stopSpeech();
    setBusy(true); setNotice(null);
    try{
      const normalized=text.trim();
      const result=await api<Extraction>('/voice/extract',{method:'POST',body:JSON.stringify({text:normalized,language})});
      setExtraction(result); setAnalyzedText(normalized); setAnalyzedLanguage(language); setAnswers({});
      setNotice({kind:'info',text:'Extraction completed. Review every field before saving.'});
    }catch(e:any){setNotice({kind:'error',text:e.message})}finally{setBusy(false)}
  };

  const save=async()=>{
    if(!extraction||!patientId)return;
    if(extractionStale){setNotice({kind:'error',text:'The transcript or language changed after extraction. Run extraction again before saving.'});return;}
    setBusy(true); setNotice(null);
    try{
      const enriched={...extraction,relevantHistory:[...extraction.relevantHistory,...Object.entries(answers).filter(([,a])=>String(a).trim()).map(([i,a])=>`Follow-up: ${extraction.followUpQuestions[Number(i)]} Answer: ${String(a).trim()}`)]};
      const clinician=user?.role==='DOCTOR'||user?.role==='ADMIN';
      await api('/voice/save',{method:'POST',body:JSON.stringify({patientId,language,transcript:text.trim(),extracted:enriched,approved:clinician})});
      setNotice({kind:'success',text:clinician?'Voice session reviewed and saved to the EHR.':'Voice session saved for clinician review. No extracted clinical data was added to the EHR yet.'});
    }catch(e:any){setNotice({kind:'error',text:e.message})}finally{setBusy(false)}
  };

  const clearAll=()=>{
    if(listening)stopSpeech();
    setText(''); setInterimText(''); setExtraction(null); setAnalyzedText(''); setAnalyzedLanguage(''); setAnswers({}); setNotice(null); setSpeechError(''); setSpeechConfidence(null);
  };

  const changeLanguage=(next:string)=>{
    if(listening)stopSpeech();
    setLanguage(next);
    setInterimText('');
  };

  return <AppShell><PageHeader eyebrow="Voice → structured record" title="Multilingual Voice Medical Assistant" text="Capture the patient's own words, convert speech to editable text, then structure it for documentation. No diagnosis or treatment is generated."/>
    <Disclaimer/>
    <div className="mt-6 grid gap-6 xl:grid-cols-[.95fr_1.05fr]">
      <section className="card p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Patient</label><select className="input" value={patientId} onChange={e=>setPatientId(e.target.value)} disabled={user?.role==='PATIENT'}>{patients.map(p=><option key={p.id} value={p.id}>{p.name} • {p.patientCode}</option>)}</select></div><div><label className="label">Language</label><select className="input" value={language} onChange={e=>changeLanguage(e.target.value)}>{Object.keys(langCodes).map(x=><option key={x}>{x}</option>)}</select></div></div>
        <div className="mt-5 flex items-center justify-between gap-4"><div><div className="font-semibold">Patient statement</div><div className="mt-1 text-xs text-slate-500">Only finalized speech is committed to the transcript. Interim words are shown separately below.</div></div><button onClick={listening?stopSpeech:startSpeech} disabled={!supported||!secureContext} className={listening?'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white':'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-700 text-white disabled:bg-slate-300'} title={supported&&secureContext?'Microphone':'Speech recognition unavailable'} aria-label={listening?'Stop microphone':'Start microphone'}>{listening?<Square className="h-4 w-4"/>:<Mic2 className="h-5 w-5"/>}</button></div>
        <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs leading-5 text-sky-900">Privacy note: microphone recognition is provided by the browser/OS and may use a remote speech service depending on the browser. Use synthetic data for this prototype and obtain appropriate consent before capturing real patient speech.</div>
        {listening&&<div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-600"/>Listening in {language}…</div>}
        {interimText&&<div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-sm italic text-cyan-900">Live: {interimText}</div>}
        {speechConfidence!==null&&<div className="mt-2 text-xs text-slate-400">Last finalized speech confidence reported by browser: {Math.round(speechConfidence*100)}%</div>}
        {(!supported||!secureContext)&&<div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{!supported?'This browser does not expose the Web Speech API. Use manual text input or a Chromium-based browser that supports it.':'Microphone speech recognition needs HTTPS (localhost is allowed).'}</div>}
        {speechError&&<div className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0"/>{speechError}</div>}
        <textarea className="input mt-4 min-h-52 resize-y leading-6" value={text} onChange={e=>setText(e.target.value)} placeholder="Type or speak patient information…"/>
        <div className="mt-4 flex flex-wrap gap-2"><button onClick={analyze} disabled={busy||text.trim().length<2} className="btn-primary"><WandSparkles className="h-4 w-4"/>{busy?'Processing…':'Extract Medical Information'}</button><button onClick={()=>{setText(sample);setLanguage('Tamil')}} className="btn-secondary">Load Tamil demo</button><button onClick={clearAll} className="btn-secondary"><Trash2 className="h-4 w-4"/>Clear</button></div>
        {notice&&<div className={`mt-4 rounded-xl p-3 text-sm ${notice.kind==='success'?'bg-emerald-50 text-emerald-800':notice.kind==='error'?'bg-rose-50 text-rose-700':'bg-slate-50 text-slate-700'}`}>{notice.text}</div>}
      </section>
      <section className="card p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-cyan-50 p-2.5 text-cyan-700"><Sparkles className="h-5 w-5"/></div><div><div className="font-bold">AI Extracted Information</div><div className="text-xs text-slate-500">Everything below is editable before saving.</div></div></div>
        {!extraction?<div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center"><div><Sparkles className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-3 text-sm text-slate-500">Submit the patient statement to see structured medical information.</p></div></div>:<div className="space-y-5">
          {extractionStale&&<div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>Transcript or language changed after extraction. Re-run extraction before saving.</div>}
          <EditField label="Chief complaint" value={extraction.chiefComplaint} onChange={v=>setExtraction({...extraction,chiefComplaint:v})}/>
          <EditableList title="Symptoms" items={extraction.symptoms} fields={['name','duration','severity']} onChange={(items:any)=>setExtraction({...extraction,symptoms:items})}/>
          <EditableList title="Existing conditions" items={extraction.conditions} fields={['name']} onChange={(items:any)=>setExtraction({...extraction,conditions:items})}/>
          <EditableList title="Current medications" items={extraction.medications} fields={['name','dosage','frequency','duration']} onChange={(items:any)=>setExtraction({...extraction,medications:items})}/>
          <EditableList title="Allergies" items={extraction.allergies} fields={['substance','reaction']} onChange={(items:any)=>setExtraction({...extraction,allergies:items})}/>
          <div><div className="mb-2 font-semibold">Smart follow-up questions</div><div className="space-y-3">{extraction.followUpQuestions.map((q,i)=><div key={`${q}-${i}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-sm font-medium text-slate-800">{q}</div><input className="input mt-2 bg-white" placeholder="Patient answer (optional)" value={answers[i]||''} onChange={e=>setAnswers({...answers,[i]:e.target.value})}/></div>)}</div></div>
          <button className="btn-primary w-full" onClick={save} disabled={busy||!patientId||extractionStale}><Save className="h-4 w-4"/>{user?.role==='PATIENT'?'Save for clinician review':'Approve review & save to EHR'}</button>
          <div className="flex gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700"/>{user?.role==='PATIENT'?'Patient submissions remain pending until a doctor/admin explicitly approves them.':'Clinician save writes reviewed structured information to the EHR with voice-session provenance.'}</div>
        </div>}
      </section>
    </div>
  </AppShell>
}

function EditField({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <div><label className="label">{label}</label><input className="input" value={value} onChange={e=>onChange(e.target.value)}/></div>}
function EditableList({title,items,fields,onChange}:{title:string;items:any[];fields:string[];onChange:(items:any[])=>void}){
  const update=(idx:number,key:string,value:string)=>onChange(items.map((x,i)=>i===idx?{...x,[key]:value}:x));
  const remove=(idx:number)=>onChange(items.filter((_,i)=>i!==idx));
  return <div><div className="mb-2 flex items-center justify-between"><div className="font-semibold">{title}</div><button type="button" onClick={()=>onChange([...items,Object.fromEntries(fields.map(f=>[f,'']))])} className="text-xs font-semibold text-cyan-700">+ Add</button></div><div className="space-y-2">{items.length===0?<div className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-400">None extracted</div>:items.map((item,idx)=><div key={idx} className="rounded-xl border border-slate-200 p-3"><div className="grid gap-2 sm:grid-cols-2">{fields.map(f=><input key={f} className="input" placeholder={f} value={item[f]||''} onChange={e=>update(idx,f,e.target.value)}/>)}</div><button type="button" onClick={()=>remove(idx)} className="mt-2 text-xs font-semibold text-rose-600">Remove</button></div>)}</div></div>
}
