import { Copy, ExternalLink, Printer, Check, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import type { SamplePrescription } from '../data/samplePrescriptions';

interface Props {
  sample: SamplePrescription;
  customText?: string;
}

export default function PrescriptionSlipPreview({ sample, customText }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = customText || sample.rawText;
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPrintable = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription Slip - ${sample.patientName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
          .header { border-bottom: 2px solid #0891b2; padding-bottom: 15px; margin-bottom: 20px; }
          .hospital { font-size: 20px; font-weight: bold; color: #0e7490; text-transform: uppercase; }
          .doctor { font-size: 14px; color: #334155; margin-top: 4px; }
          .meta { display: flex; justify-content: space-between; background: #f8fafc; padding: 10px 14px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
          .rx { font-size: 28px; font-weight: bold; color: #0e7490; margin-bottom: 10px; font-style: italic; }
          .med-item { margin-bottom: 14px; padding-left: 10px; border-left: 3px solid #06b6d4; }
          .med-name { font-weight: bold; font-size: 15px; color: #0f172a; }
          .med-inst { font-size: 13px; color: #475569; margin-top: 2px; }
          .footer { margin-top: 40px; border-top: 1px dashed #cbd5e1; pt: 15px; display: flex; justify-content: space-between; align-items: flex-end; }
          .stamp { text-align: right; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hospital">${sample.hospital}</div>
          <div class="doctor">${sample.doctor} • Reg: ${sample.doctorReg}</div>
        </div>
        <div class="meta">
          <div><strong>Patient:</strong> ${sample.patientName} (${sample.patientCode}) | Age: 52 / M</div>
          <div><strong>Date:</strong> ${sample.date}</div>
        </div>
        <div class="rx">℞</div>
        ${sample.extraction.medicines.map((m, idx) => `
          <div class="med-item">
            <div class="med-name">${idx + 1}. ${m.name} (${m.dosage})</div>
            <div class="med-inst">Schedule: ${m.frequency} • Duration: ${m.duration}</div>
          </div>
        `).join('')}
        <div class="footer">
          <div style="font-size:12px; color:#64748b;">Digitally verified via MediBridge AI Vision OCR Engine</div>
          <div class="stamp">
            <div style="font-family:cursive; font-size:18px; color:#0e7490; margin-bottom:4px;">${sample.doctor.split(',')[0]}</div>
            <div>Authorized Medical Practitioner</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <div className="relative rounded-2xl border-2 border-slate-300 bg-white p-5 shadow-sm text-slate-800">
      {/* Top Action Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
          <Stethoscope className="h-4 w-4 text-cyan-600" />
          <span>Authentic Hospital Prescription Slip</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            title="Copy Prescription text to clipboard"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
          <button
            type="button"
            onClick={handleOpenPrintable}
            className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
            title="Open printable prescription in new tab (can show to phone camera)"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open / Print Slip
          </button>
        </div>
      </div>

      {/* Hospital Letterhead */}
      <div className="border-b-2 border-cyan-700 pb-3 text-center sm:text-left">
        <div className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-cyan-900">
          {sample.hospital}
        </div>
        <div className="mt-0.5 text-xs font-medium text-slate-600">
          {sample.doctor} • <span className="text-slate-500">Reg: {sample.doctorReg}</span>
        </div>
      </div>

      {/* Patient Demographics Banner */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200">
        <div>
          <span className="font-bold text-slate-700">Patient: </span>
          <span className="font-extrabold text-cyan-950">{sample.patientName}</span>
          <span className="text-slate-500"> ({sample.patientCode})</span>
          <span className="ml-2 font-medium text-slate-500">• {sample.patientDetails}</span>
        </div>
        <div>
          <span className="font-bold text-slate-700">Date: </span>
          <span className="font-semibold text-slate-900">{sample.date}</span>
        </div>
      </div>

      {/* Diagnosis Bar */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-bold text-slate-600">Diagnosis:</span>
        {sample.extraction.diagnosisRecorded.map((d) => (
          <span
            key={d}
            className="rounded-md bg-cyan-50 px-2 py-0.5 font-semibold text-cyan-800 border border-cyan-200 text-[11px]"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Clinical Rx Script */}
      <div className="mt-4 space-y-3">
        <div className="text-2xl font-black italic text-cyan-700 font-serif leading-none">℞</div>
        <div className="space-y-2.5 pl-2">
          {sample.extraction.medicines.map((m, idx) => (
            <div
              key={m.name}
              className="rounded-lg border-l-4 border-cyan-600 bg-slate-50/70 p-2.5 transition hover:bg-slate-50"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold text-xs sm:text-sm text-slate-900">
                  {idx + 1}. {m.name}
                </span>
                <span className="rounded bg-white px-2 py-0.5 text-[11px] font-bold text-cyan-700 border border-slate-200">
                  {m.dosage}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                <span>
                  <strong>Schedule:</strong> {m.frequency}
                </span>
                <span>
                  <strong>Duration:</strong> {m.duration}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Doctor Seal & Verification */}
      <div className="mt-6 flex flex-wrap items-end justify-between border-t border-slate-200 pt-3 text-xs">
        <div className="text-[10px] text-slate-400">
          MediBridge Clinical EHR Verified • System Timestamp: {new Date().toLocaleTimeString()}
        </div>
        <div className="text-right">
          <div className="font-serif italic text-cyan-800 font-bold text-sm tracking-wide">
            Dr. Priya Raman
          </div>
          <div className="text-[10px] text-slate-500">Authorized Clinician Seal</div>
        </div>
      </div>
    </div>
  );
}
