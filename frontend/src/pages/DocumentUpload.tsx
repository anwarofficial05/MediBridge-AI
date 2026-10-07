import { Camera, CheckCircle2, FileImage, FileUp, Save, Trash2, Volume2, XCircle, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AppShell from '../layouts/AppShell';
import PageHeader from '../components/PageHeader';
import Disclaimer from '../components/Disclaimer';
import SafetyAlertHUD from '../components/SafetyAlertHUD';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { Patient } from '../types';

type Notice = { kind: 'success' | 'error' | 'info'; text: string } | null;

export default function DocumentUpload() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [type, setType] = useState('PRESCRIPTION');
  const [docId, setDocId] = useState('');
  const [data, setData] = useState<any>(null);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  // Live Camera Scanner State
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (user?.role === 'PATIENT') {
          const p = await api<Patient>('/patients/me');
          setPatients([p]);
          setPatientId(p.id);
        } else {
          const ps = await api<Patient[]>('/patients');
          setPatients(ps);
          setPatientId(ps[0]?.id || '');
        }
      } catch (e: any) {
        setNotice({ kind: 'error', text: e.message });
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setNotice(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      setNotice({ kind: 'error', text: `Camera access denied or unavailable: ${err.message}` });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const capturedFile = new File([blob], `prescription-live-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      stopCamera();
      pick(capturedFile);
      setNotice({ kind: 'info', text: 'Live photo captured. Ready for AI medical extraction.' });
    }, 'image/jpeg', 0.95);
  };

  const pick = (next: File | null) => {
    if (next && !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(next.type)) {
      setNotice({ kind: 'error', text: 'Choose a PDF, JPG, PNG or WEBP file.' });
      return;
    }
    setFile(next);
    setData(null);
    setDocId('');
    setApproved(false);
    setNotice(null);
  };

  const extract = async () => {
    if (!file || !patientId) return;
    setBusy(true);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.append('document', file);
      fd.append('patientId', patientId);
      fd.append('documentType', type);
      const result = await api<any>('/documents/extract', { method: 'POST', body: fd });
      setDocId(result.document.id);
      setData(result.extracted);
      setApproved(false);
      setNotice({
        kind: 'info',
        text: 'Document analyzed with Clinical Vision AI & Safety Engine. Review findings before approval.',
      });
    } catch (e: any) {
      setNotice({ kind: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const saveCorrections = async () => {
    if (!docId || !data || approved) return;
    setBusy(true);
    setNotice(null);
    try {
      await api(`/documents/${docId}/extracted`, { method: 'PUT', body: JSON.stringify(data) });
      setNotice({ kind: 'success', text: 'Corrections saved. The document remains pending clinician review.' });
    } catch (e: any) {
      setNotice({ kind: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!docId || !data || approved) return;
    setBusy(true);
    setNotice(null);
    try {
      await api(`/documents/${docId}/approve`, { method: 'POST', body: JSON.stringify({ extracted: data }) });
      setApproved(true);
      setNotice({
        kind: 'success',
        text: 'Approved. Verified diagnoses, medications, lab results and allergies were added to the patient EHR.',
      });
    } catch (e: any) {
      setNotice({ kind: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const speakSchedule = (lang: 'ta' | 'en') => {
    if (!data?.medicines?.length || typeof window === 'undefined') return;
    window.speechSynthesis?.cancel();

    let textToSpeak = '';
    if (lang === 'ta') {
      textToSpeak = 'மருந்து அறிவுரைகள்: ' + data.medicines.map((m: any) =>
        `${m.name}, அளவு ${m.dosage || 'அறிவிக்கப்பட்டபடி'}, உட்கொள்ளும் முறை ${m.frequency || 'உணவுக்குப் பின்'}.`
      ).join(' ') + ' மருத்துவ அறிவுரையை தவறாமல் பின்பற்றவும்.';
    } else {
      textToSpeak = 'Medication instructions: ' + data.medicines.map((m: any) =>
        `${m.name}, dose ${m.dosage || 'as directed'}, frequency ${m.frequency || 'after meals'}.`
      ).join(' ') + ' Adhere strictly to the clinician schedule.';
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    utterance.rate = 0.95;
    window.speechSynthesis?.speak(utterance);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Vision OCR & Clinical Safety Matrix"
        title="Medical Document Intelligence & Safety Scanner"
        text="Upload or snap a live photo of a prescription or lab report. Real-time vision extracts medical entities and cross-checks drug-drug interactions and allergies."
      />
      <Disclaimer />

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* LEFT COLUMN: UPLOAD & CAMERA SCANNER */}
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Target Patient</label>
                <select
                  className="input"
                  value={patientId}
                  disabled={user?.role === 'PATIENT'}
                  onChange={(e) => setPatientId(e.target.value)}
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} • {p.patientCode}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Document type</label>
                <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                  {[
                    'PRESCRIPTION',
                    'LAB_REPORT',
                    'DISCHARGE_SUMMARY',
                    'CONSULTATION_REPORT',
                    'MEDICAL_CERTIFICATE',
                    'OTHER',
                  ].map((x) => (
                    <option key={x} value={x}>
                      {x.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-5">
            {/* Action buttons: Upload File OR Live Camera */}
            {!cameraActive ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid min-h-24 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center hover:border-cyan-300">
                  <input
                    className="hidden"
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => pick(e.target.files?.[0] || null)}
                  />
                  <div>
                    <FileUp className="mx-auto h-6 w-6 text-cyan-700" />
                    <div className="mt-1 text-xs font-semibold">Choose PDF or Image</div>
                    <div className="text-[11px] text-slate-500">PDF, JPG, PNG, WEBP</div>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={startCamera}
                  className="grid min-h-24 place-items-center rounded-2xl border-2 border-dashed border-cyan-200 bg-cyan-50/50 p-4 text-center hover:bg-cyan-50 transition"
                >
                  <div>
                    <Camera className="mx-auto h-6 w-6 text-cyan-700" />
                    <div className="mt-1 text-xs font-semibold text-cyan-900">Scan via Live Camera</div>
                    <div className="text-[11px] text-cyan-700">Hold paper or phone to webcam</div>
                  </div>
                </button>
              </div>
            ) : (
              /* Live Camera Stream Interface */
              <div className="overflow-hidden rounded-2xl border border-cyan-300 bg-slate-900 p-3 text-center">
                <div className="relative mx-auto max-h-[360px] overflow-hidden rounded-xl bg-black">
                  <video ref={videoRef} autoPlay playsInline className="h-full w-full object-contain" />
                  <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-dashed border-cyan-400 opacity-70" />
                </div>
                <div className="mt-3 flex justify-center gap-2">
                  <button type="button" onClick={capturePhoto} className="btn-primary px-5 py-2.5">
                    <Camera className="h-4 w-4 mr-1.5" /> Capture Prescription
                  </button>
                  <button type="button" onClick={stopCamera} className="btn-secondary px-4 py-2.5">
                    <XCircle className="h-4 w-4 mr-1" /> Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Hidden canvas for snapshot rasterization */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Selected File Bar */}
            {file && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-cyan-200 bg-cyan-50/40 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{file.name}</div>
                  <div className="text-xs text-slate-500">{Math.ceil(file.size / 1024)} KB</div>
                </div>
                <button onClick={extract} disabled={busy} className="btn-primary">
                  {busy ? 'Analyzing...' : 'Extract & Analyze Safety'}
                </button>
              </div>
            )}

            {/* Preview Box */}
            <div className="mt-4 min-h-[380px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              {!preview ? (
                <div className="grid h-[380px] place-items-center text-slate-400">
                  <div className="text-center">
                    <FileImage className="mx-auto h-8 w-8" />
                    <div className="mt-2 text-sm">Original document preview appears here</div>
                  </div>
                </div>
              ) : file?.type === 'application/pdf' ? (
                <iframe className="h-[480px] w-full bg-white" src={preview} title="Document preview" />
              ) : (
                <img className="h-[480px] w-full object-contain" src={preview} alt="Document preview" />
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: AI EXTRACTION & CLINICAL SAFETY HUD */}
        <section className="card p-5">
          <div className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base">Extracted Clinical Information</h2>
                {approved && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Approved & Locked
                  </span>
                )}
              </div>
              {data?.medicines?.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => speakSchedule('en')}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    title="Speak dosage schedule in English"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-cyan-700" /> Speak (EN)
                  </button>
                  <button
                    type="button"
                    onClick={() => speakSchedule('ta')}
                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
                    title="Speak dosage schedule in Tamil"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-cyan-700" /> தமிழில் பேசு (TA)
                  </button>
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Verified with Medical Entity Recognition & Multi-Drug Interaction Safety Matrix.
            </p>
          </div>

          {!data ? (
            <div className="grid min-h-[480px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              <div>
                <Sparkles className="mx-auto h-8 w-8 text-cyan-700 opacity-60 mb-2" />
                Upload a prescription or use the Live Camera on the left to extract medications and test safety rules.
              </div>
            </div>
          ) : (
            <fieldset disabled={approved} className="space-y-4 disabled:opacity-75">
              {/* REAL-TIME CLINICAL SAFETY ALERT HUD */}
              <SafetyAlertHUD safety={data.safetyEvaluation} />

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Patient name', 'patientName'],
                  ['Doctor name', 'doctorName'],
                  ['Hospital', 'hospital'],
                  ['Date', 'date'],
                  ['Follow-up date', 'followUpDate'],
                ].map(([label, key]) => (
                  <Field
                    key={key}
                    label={label}
                    value={data[key] || ''}
                    set={(v) => setData({ ...data, [key]: v })}
                  />
                ))}
              </div>

              <ListEditor
                title="Diagnoses recorded in document"
                items={(data.diagnosisRecorded || []).map((x: string) => ({ name: x }))}
                fields={['name']}
                onChange={(v: any[]) =>
                  setData({ ...data, diagnosisRecorded: v.map((x) => x.name).filter(Boolean) })
                }
              />

              <ListEditor
                title="Prescribed Medicines"
                items={data.medicines || []}
                fields={['name', 'dosage', 'frequency', 'duration']}
                onChange={(v) => setData({ ...data, medicines: v })}
              />

              <ListEditor
                title="Lab tests recorded"
                items={data.labTests || []}
                fields={['name', 'value', 'unit', 'referenceRange']}
                onChange={(v) => setData({ ...data, labTests: v })}
              />

              <ListEditor
                title="Documented Allergies"
                items={data.allergies || []}
                fields={['substance', 'reaction']}
                onChange={(v) => setData({ ...data, allergies: v })}
              />

              <div>
                <label className="label">Clinical extraction note</label>
                <textarea
                  className="input min-h-20"
                  value={data.note || ''}
                  onChange={(e) => setData({ ...data, note: e.target.value })}
                />
              </div>

              {!approved && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <button type="button" onClick={saveCorrections} disabled={busy} className="btn-secondary">
                    <Save className="h-4 w-4 mr-1.5" /> Save corrections
                  </button>
                  {user?.role !== 'PATIENT' && (
                    <button type="button" onClick={approve} disabled={busy} className="btn-primary">
                      <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve & Save to EHR
                    </button>
                  )}
                </div>
              )}
            </fieldset>
          )}

          {notice && (
            <div
              className={`mt-4 rounded-xl p-3 text-sm ${
                notice.kind === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : notice.kind === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              {notice.text}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, value, set }: { label: string; value: string; set: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value} onChange={(e) => set(e.target.value)} />
    </div>
  );
}

function ListEditor({
  title,
  items,
  fields,
  onChange,
}: {
  title: string;
  items: any[];
  fields: string[];
  onChange: (v: any[]) => void;
}) {
  const update = (i: number, k: string, v: string) =>
    onChange(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <button
          type="button"
          className="text-xs font-semibold text-cyan-700 hover:text-cyan-900"
          onClick={() => onChange([...items, Object.fromEntries(fields.map((f) => [f, '']))])}
        >
          + Add entry
        </button>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-400">
            No entries recorded
          </div>
        ) : (
          items.map((item, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
              <div className="grid gap-2 sm:grid-cols-2">
                {fields.map((f) => (
                  <input
                    key={f}
                    className="input text-xs"
                    placeholder={f}
                    value={item[f] || ''}
                    onChange={(e) => update(i, f, e.target.value)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
