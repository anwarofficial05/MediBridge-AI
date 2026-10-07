import { AlertTriangle, CheckCircle2, Mic2, Save, Sparkles, Square, Trash2, WandSparkles, ShieldAlert, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppShell from '../layouts/AppShell';
import PageHeader from '../components/PageHeader';
import Disclaimer from '../components/Disclaimer';
import SafetyAlertHUD from '../components/SafetyAlertHUD';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { Extraction, Patient } from '../types';

const langCodes: Record<string, string> = { Tamil: 'ta-IN', English: 'en-IN', Hindi: 'hi-IN', Telugu: 'te-IN' };

const DEMO_PRESETS = [
  {
    label: 'Demo 1: Tamil (Fever & Diabetes)',
    lang: 'Tamil',
    text: 'Enakku moonu naala fever irukku. Inniki moochu vida konjam kashtama irukku. Enakku sugar irukku. Metformin tablet sapidren.',
  },
  {
    label: 'Demo 2: Critical Allergy Conflict',
    lang: 'English',
    text: 'I have severe sore throat and fever for 2 days. The doctor gave me Amoxicillin 500mg, but I have a known allergy to Penicillin.',
  },
  {
    label: 'Demo 3: Drug Interaction (Warfarin + Aspirin)',
    lang: 'English',
    text: 'I am taking Warfarin 2.5mg daily for heart clots. Today I took Aspirin 75mg and Ibuprofen 400mg for joint pain.',
  },
];

type Notice = { kind: 'success' | 'error' | 'info'; text: string } | null;

export default function VoiceConsultation() {
  const { user } = useAuth();
  const [language, setLanguage] = useState('Tamil');
  const [text, setText] = useState(DEMO_PRESETS[0].text);
  const [interimText, setInterimText] = useState('');
  const [speechConfidence, setSpeechConfidence] = useState<number | null>(null);
  const [speechError, setSpeechError] = useState('');
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [analyzedText, setAnalyzedText] = useState('');
  const [analyzedLanguage, setAnalyzedLanguage] = useState('');
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const recognitionRef = useRef<any>(null);
  const processedFinalIndexesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        if (user?.role === 'PATIENT') {
          const p = await api<Patient>('/patients/me');
          setPatientId(p.id);
          setPatients([p]);
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

  useEffect(() => () => {
    try {
      recognitionRef.current?.abort?.();
    } catch {}
  }, []);

  const supported = useMemo(
    () =>
      typeof window !== 'undefined' &&
      Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    []
  );
  const secureContext = typeof window === 'undefined' || window.isSecureContext || window.location.hostname === 'localhost';
  const extractionStale = Boolean(extraction && (text.trim() !== analyzedText || language !== analyzedLanguage));

  const stopSpeech = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {}
    setListening(false);
    setInterimText('');
  };

  const startSpeech = () => {
    if (!supported) {
      setSpeechError('Speech recognition is not supported in this browser. Use manual text input.');
      return;
    }
    if (!secureContext) {
      setSpeechError('Microphone speech recognition requires HTTPS (or localhost).');
      return;
    }
    if (listening) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = langCodes[language];
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    processedFinalIndexesRef.current = new Set();
    setSpeechError('');
    setInterimText('');
    setSpeechConfidence(null);

    recognition.onstart = () => setListening(true);
    recognition.onresult = (event: any) => {
      const finalChunks: string[] = [];
      const interimChunks: string[] = [];
      const confidenceValues: number[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alternative = result?.[0];
        const transcript = String(alternative?.transcript || '').trim();
        if (!transcript) continue;
        if (result.isFinal) {
          if (processedFinalIndexesRef.current.has(i)) continue;
          processedFinalIndexesRef.current.add(i);
          finalChunks.push(transcript);
          if (typeof alternative.confidence === 'number' && alternative.confidence > 0)
            confidenceValues.push(alternative.confidence);
        } else {
          interimChunks.push(transcript);
        }
      }
      if (finalChunks.length) {
        setText((prev) => `${prev.trim()}${prev.trim() ? ' ' : ''}${finalChunks.join(' ')}`.trim());
      }
      setInterimText(interimChunks.join(' '));
      if (confidenceValues.length) {
        setSpeechConfidence(confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length);
      }
    };
    recognition.onerror = (event: any) => {
      const code = String(event?.error || 'unknown');
      const messages: Record<string, string> = {
        'not-allowed': 'Microphone permission was denied. Allow microphone access in your browser settings.',
        'no-speech': 'No speech was detected. Try again and speak closer to the microphone.',
        network: 'Speech recognition had a network error. You can continue with manual text input.',
        aborted: 'Speech recognition stopped.',
      };
      if (code !== 'aborted') setSpeechError(messages[code] || `Speech recognition error: ${code}`);
      setListening(false);
      setInterimText('');
    };
    recognition.onend = () => {
      setListening(false);
      setInterimText('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setSpeechError('Unable to start speech recognition. Please try again.');
    }
  };

  const analyze = async () => {
    if (listening) stopSpeech();
    setBusy(true);
    setNotice(null);
    try {
      const normalized = text.trim();
      const result = await api<Extraction>('/voice/extract', {
        method: 'POST',
        body: JSON.stringify({ text: normalized, language, patientId }),
      });
      setExtraction(result);
      setAnalyzedText(normalized);
      setAnalyzedLanguage(language);
      setAnswers({});
      setNotice({ kind: 'info', text: 'Medical entities & safety matrix analyzed. Review before saving.' });
    } catch (e: any) {
      setNotice({ kind: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!extraction || !patientId) return;
    if (extractionStale) {
      setNotice({
        kind: 'error',
        text: 'The transcript or language changed after extraction. Run extraction again before saving.',
      });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const enriched = {
        ...extraction,
        relevantHistory: [
          ...extraction.relevantHistory,
          ...Object.entries(answers)
            .filter(([, a]) => String(a).trim())
            .map(([i, a]) => `Follow-up: ${extraction.followUpQuestions[Number(i)]} Answer: ${String(a).trim()}`),
        ],
      };
      const clinician = user?.role === 'DOCTOR' || user?.role === 'ADMIN';
      await api('/voice/save', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          language,
          transcript: text.trim(),
          extracted: enriched,
          approved: clinician,
        }),
      });
      setNotice({
        kind: 'success',
        text: clinician
          ? 'Voice session reviewed and saved to the longitudinal EHR.'
          : 'Voice session saved for clinician review. A doctor must approve it before inclusion into the EHR.',
      });
    } catch (e: any) {
      setNotice({ kind: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    if (listening) stopSpeech();
    setText('');
    setInterimText('');
    setExtraction(null);
    setAnalyzedText('');
    setAnalyzedLanguage('');
    setAnswers({});
    setNotice(null);
    setSpeechError('');
    setSpeechConfidence(null);
  };

  const changeLanguage = (next: string) => {
    if (listening) stopSpeech();
    setLanguage(next);
    setInterimText('');
  };

  const loadPreset = (p: typeof DEMO_PRESETS[0]) => {
    if (listening) stopSpeech();
    setLanguage(p.lang);
    setText(p.text);
    setExtraction(null);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Multilingual Clinical Intelligence"
        title="Multilingual Voice Medical Assistant"
        text="Capture the patient's spoken words in Tamil, Hindi, Telugu, or English. Extracts structured clinical entities and cross-checks medication safety."
      />
      <Disclaimer />

      {/* QUICK PRESET BAR FOR LIVE JUDGE DEMOS */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Zap className="h-3.5 w-3.5 text-amber-500" /> Quick Judge Scenarios:
        </span>
        {DEMO_PRESETS.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => loadPreset(p)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-cyan-400 hover:bg-cyan-50/50 shadow-2xs transition"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[.95fr_1.05fr]">
        {/* LEFT COLUMN: SPEECH CAPTURE */}
        <section className="card p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Target Patient</label>
              <select
                className="input"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                disabled={user?.role === 'PATIENT'}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} • {p.patientCode}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Language</label>
              <select className="input" value={language} onChange={(e) => changeLanguage(e.target.value)}>
                {Object.keys(langCodes).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-slate-900">Patient statement</div>
              <div className="mt-1 text-xs text-slate-500">
                Speak into the microphone or type directly into the transcript box.
              </div>
            </div>
            <button
              onClick={listening ? stopSpeech : startSpeech}
              disabled={!supported || !secureContext}
              className={
                listening
                  ? 'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white animate-pulse shadow-md'
                  : 'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-700 text-white hover:bg-cyan-800 disabled:bg-slate-300 shadow-md transition'
              }
              title={supported && secureContext ? 'Microphone' : 'Speech recognition unavailable'}
              aria-label={listening ? 'Stop microphone' : 'Start microphone'}
            >
              {listening ? <Square className="h-4 w-4" /> : <Mic2 className="h-5 w-5" />}
            </button>
          </div>

          {listening && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-600" />
              Actively listening in {language}... Speak clearly.
            </div>
          )}

          {interimText && (
            <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-sm italic text-cyan-900">
              Live: {interimText}
            </div>
          )}

          {speechConfidence !== null && (
            <div className="mt-2 text-xs text-slate-400">
              Speech recognition confidence: {Math.round(speechConfidence * 100)}%
            </div>
          )}

          {speechError && (
            <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {speechError}
            </div>
          )}

          <textarea
            className="input mt-4 min-h-48 resize-y leading-6"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or speak patient statement in Tamil, English, Hindi, or Telugu..."
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={analyze}
              disabled={busy || text.trim().length < 2}
              className="btn-primary"
            >
              <WandSparkles className="h-4 w-4 mr-1.5" />
              {busy ? 'Extracting...' : 'Extract Clinical Entities & Safety'}
            </button>
            <button onClick={clearAll} className="btn-secondary">
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </button>
          </div>

          {notice && (
            <div
              className={`mt-4 rounded-xl p-3 text-sm ${
                notice.kind === 'success'
                  ? 'bg-emerald-50 text-emerald-800'
                  : notice.kind === 'error'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-slate-50 text-slate-700'
              }`}
            >
              {notice.text}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: CLINICAL EXTRACTION & SAFETY HUD */}
        <section className="card p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-cyan-50 p-2.5 text-cyan-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-base">Structured Clinical Information</div>
              <div className="text-xs text-slate-500">Cross-checked with Patient EHR safety rules.</div>
            </div>
          </div>

          {!extraction ? (
            <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
              <div>
                <Sparkles className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">
                  Click 'Extract Clinical Entities & Safety' on the left to analyze the statement.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* REAL-TIME SAFETY ALERT HUD */}
              <SafetyAlertHUD safety={extraction.safetyEvaluation} />

              {extractionStale && (
                <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Transcript or language changed. Re-run extraction before saving.
                </div>
              )}

              <EditField
                label="Chief complaint"
                value={extraction.chiefComplaint}
                onChange={(v) => setExtraction({ ...extraction, chiefComplaint: v })}
              />

              <EditableList
                title="Symptoms Reported"
                items={extraction.symptoms}
                fields={['name', 'duration', 'severity']}
                onChange={(items: any) => setExtraction({ ...extraction, symptoms: items })}
              />

              <EditableList
                title="Chronic Conditions Mentioned"
                items={extraction.conditions}
                fields={['name']}
                onChange={(items: any) => setExtraction({ ...extraction, conditions: items })}
              />

              <EditableList
                title="Medications Mentioned"
                items={extraction.medications}
                fields={['name', 'dosage', 'frequency', 'duration']}
                onChange={(items: any) => setExtraction({ ...extraction, medications: items })}
              />

              <EditableList
                title="Allergies Mentioned"
                items={extraction.allergies}
                fields={['substance', 'reaction']}
                onChange={(items: any) => setExtraction({ ...extraction, allergies: items })}
              />

              <div>
                <div className="mb-2 font-semibold text-sm text-slate-900">Clinical Follow-Up Inquiries</div>
                <div className="space-y-2">
                  {extraction.followUpQuestions.map((q, i) => (
                    <div key={`${q}-${i}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-800">{q}</div>
                      <input
                        className="input mt-1.5 bg-white text-xs"
                        placeholder="Patient response (optional)"
                        value={answers[i] || ''}
                        onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                className="btn-primary w-full py-3"
                onClick={save}
                disabled={busy || !patientId || extractionStale}
              >
                <Save className="h-4 w-4 mr-1.5" />
                {user?.role === 'PATIENT' ? 'Save for Clinician Review' : 'Approve & Save to Longitudinal EHR'}
              </button>

              <div className="flex gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
                {user?.role === 'PATIENT'
                  ? 'Patient submissions remain in pending queue until doctor confirmation.'
                  : 'Clinician approval commits verified structured records directly to the patient graph.'}
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function EditableList({
  title,
  items,
  fields,
  onChange,
}: {
  title: string;
  items: any[];
  fields: string[];
  onChange: (items: any[]) => void;
}) {
  const update = (idx: number, key: string, value: string) =>
    onChange(items.map((x, i) => (i === idx ? { ...x, [key]: value } : x)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold text-sm text-slate-900">{title}</div>
        <button
          type="button"
          onClick={() => onChange([...items, Object.fromEntries(fields.map((f) => [f, '']))])}
          className="text-xs font-semibold text-cyan-700 hover:text-cyan-900"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-400">
            None extracted
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
              <div className="grid gap-2 sm:grid-cols-2">
                {fields.map((f) => (
                  <input
                    key={f}
                    className="input text-xs"
                    placeholder={f}
                    value={item[f] || ''}
                    onChange={(e) => update(idx, f, e.target.value)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="mt-2 text-xs font-semibold text-rose-600 hover:text-rose-800"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
