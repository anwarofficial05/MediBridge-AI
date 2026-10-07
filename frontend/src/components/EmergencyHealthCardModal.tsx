import { AlertOctagon, HeartPulse, QrCode, ShieldAlert, X, Printer, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function EmergencyHealthCardModal({
  patientId,
  onClose,
}: {
  patientId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/patients/${patientId}/emergency-card`)
      .then(setData)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
        <div className="rounded-2xl bg-white p-6 shadow-xl">Loading Emergency Health Card...</div>
      </div>
    );
  }

  if (!data) return null;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    `[MEDIBRIDGE EMERGENCY HEALTH CARD]\nID: ${data.patientCode}\nPatient: ${data.name}\nAllergies: ${
      data.criticalAllergies?.join(', ') || 'None'
    }\nMeds: ${data.currentMedications?.join(', ') || 'None'}\nCall 108 in Emergency`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-red-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-white/20 p-1.5">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-wide uppercase">Emergency Medical Pass</h3>
                <p className="text-[11px] text-rose-100">Instantly accessible by first responders</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Scannable QR Code */}
            <div className="shrink-0 text-center">
              <div className="rounded-2xl border-2 border-slate-900 p-2 bg-white shadow-sm inline-block">
                <img
                  src={qrUrl}
                  alt="Emergency QR Code"
                  className="h-36 w-36 object-contain"
                />
              </div>
              <div className="mt-1 text-[10px] font-bold tracking-wider uppercase text-slate-500 flex items-center justify-center gap-1">
                <QrCode className="h-3 w-3" /> Scan with Phone
              </div>
            </div>

            {/* Patient Vitals */}
            <div className="flex-1 min-w-0 text-left">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                {data.patientCode}
              </span>
              <h2 className="mt-1 text-xl font-black text-slate-900 truncate">{data.name}</h2>
              <div className="mt-0.5 text-xs text-slate-500">
                {data.age ? `${data.age} yrs` : 'Age N/A'} • {data.gender || 'Gender N/A'} • Preferred: {data.preferredLanguage}
              </div>

              {/* Critical Allergies */}
              <div className="mt-3">
                <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" /> Critical Allergies
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {data.criticalAllergies?.length > 0 ? (
                    data.criticalAllergies.map((a: string, i: number) => (
                      <span
                        key={i}
                        className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800"
                      >
                        ⚠️ {a}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No known drug allergies</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chronic Conditions & Active Medications */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 rounded-2xl bg-slate-50 p-4 border border-slate-100 text-xs">
            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Chronic Conditions:
              </span>
              <p className="mt-1 font-semibold text-slate-900">
                {data.chronicConditions?.length > 0
                  ? data.chronicConditions.join(', ')
                  : 'None registered'}
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Active Pharmacotherapy:
              </span>
              <p className="mt-1 font-semibold text-slate-900 truncate">
                {data.currentMedications?.length > 0
                  ? data.currentMedications.join(', ')
                  : 'No active medications'}
              </p>
            </div>
          </div>

          {/* Emergency Hotline Protocol */}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-900 border border-amber-200">
            <span className="flex items-center gap-1.5 font-bold">
              <Phone className="h-3.5 w-3.5 text-amber-700" /> Ambulance & Emergency Triage: 108
            </span>
            <span className="text-[11px] text-amber-700 font-semibold">MediBridge Protocol</span>
          </div>

          {/* Actions */}
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => window.print()}
              className="btn-secondary text-xs"
            >
              <Printer className="h-3.5 w-3.5 mr-1" /> Print Card
            </button>
            <button onClick={onClose} className="btn-primary text-xs">
              Close Pass
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
