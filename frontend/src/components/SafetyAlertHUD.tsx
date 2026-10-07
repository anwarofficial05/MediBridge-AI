import { AlertOctagon, AlertTriangle, CheckCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { SafetyEvaluation } from '../types';

export default function SafetyAlertHUD({ safety }: { safety?: SafetyEvaluation }) {
  if (!safety) return null;

  const isCritical = safety.hasCriticalAlerts || safety.safetyScore < 60;
  const isModerate = !isCritical && (safety.interactionAlerts.length > 0 || safety.allergyAlerts.length > 0);

  if (!isCritical && !isModerate) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Clinical Safety Check: PASSED</span>
              <span className="rounded-full bg-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                Score: {safety.safetyScore}/100
              </span>
            </div>
            <p className="mt-0.5 text-xs text-emerald-700">
              No drug-drug interactions or known patient allergen contraindications detected.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition-all ${
        isCritical
          ? 'border-rose-300 bg-gradient-to-br from-rose-50 via-white to-red-50 text-rose-950'
          : 'border-amber-300 bg-amber-50/90 text-amber-950'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`rounded-xl p-2.5 ${
            isCritical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isCritical ? (
            <AlertOctagon className="h-6 w-6 animate-pulse" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isCritical
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {isCritical ? 'CRITICAL CONTRAINDICATION' : 'CLINICAL CAUTION'}
              </span>
              <span className="text-xs font-bold text-slate-500">
                Safety Score: {safety.safetyScore}/100
              </span>
            </div>
          </div>

          <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-800">
            {safety.safetySummary}
          </p>

          {/* Allergy Conflict Alerts */}
          {safety.allergyAlerts.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                Allergy Cross-Reactivity Conflicts ({safety.allergyAlerts.length})
              </div>
              {safety.allergyAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-rose-200 bg-white p-3 text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between font-bold text-rose-800">
                    <span>
                      Prescribed: <span className="underline">{alert.medication}</span> vs. Patient
                      Allergen: <span className="underline">{alert.allergen}</span>
                    </span>
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-800">
                      {alert.severity}
                    </span>
                  </div>
                  <div className="mt-1 text-slate-700 leading-4">
                    <span className="font-semibold text-rose-700">Risk:</span> {alert.clinicalEffect}
                  </div>
                  <div className="mt-1 text-slate-600 leading-4">
                    <span className="font-semibold text-emerald-700">Action:</span>{' '}
                    {alert.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Drug-Drug Interaction Alerts */}
          {safety.interactionAlerts.length > 0 && (
            <div className="mt-3 space-y-2">
              <div
                className={`text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                  isCritical ? 'text-rose-700' : 'text-amber-700'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Drug-Drug Interactions ({safety.interactionAlerts.length})
              </div>
              {safety.interactionAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border bg-white p-3 text-xs shadow-xs ${
                    alert.severity === 'CRITICAL' ? 'border-rose-200' : 'border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>
                      {alert.drugA} <span className="text-rose-600 font-extrabold">⚡</span>{' '}
                      {alert.drugB}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <div className="mt-1 text-slate-600 text-[11px]">
                    <span className="font-semibold text-slate-700">Mechanism:</span>{' '}
                    {alert.mechanism}
                  </div>
                  <div className="mt-1 text-slate-700">
                    <span className="font-semibold text-rose-700">Clinical Impact:</span>{' '}
                    {alert.clinicalEffect}
                  </div>
                  <div className="mt-1 text-slate-600">
                    <span className="font-semibold text-emerald-700">Recommendation:</span>{' '}
                    {alert.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
