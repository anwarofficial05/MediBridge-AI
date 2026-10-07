export type SeverityLevel = 'CRITICAL' | 'MODERATE' | 'LOW';

export type DrugInteractionAlert = {
  drugA: string;
  drugB: string;
  severity: SeverityLevel;
  mechanism: string;
  clinicalEffect: string;
  recommendation: string;
};

export type AllergyConflictAlert = {
  medication: string;
  allergen: string;
  severity: SeverityLevel;
  clinicalEffect: string;
  recommendation: string;
};

export type SafetyEvaluationResult = {
  hasCriticalAlerts: boolean;
  interactionAlerts: DrugInteractionAlert[];
  allergyAlerts: AllergyConflictAlert[];
  safetyScore: number; // 0 (dangerous) to 100 (safe)
  safetySummary: string;
};

// Common medication aliases & normalization table
const MEDICATION_ALIASES: Record<string, string> = {
  metformin: 'metformin',
  glycomet: 'metformin',
  glimin: 'metformin',
  aspirin: 'aspirin',
  ecosprin: 'aspirin',
  disprin: 'aspirin',
  acetylsalicylic: 'aspirin',
  warfarin: 'warfarin',
  coumadin: 'warfarin',
  clopidogrel: 'clopidogrel',
  plavix: 'clopidogrel',
  clopilet: 'clopidogrel',
  amlodipine: 'amlodipine',
  amlong: 'amlodipine',
  stamlo: 'amlodipine',
  atorvastatin: 'atorvastatin',
  atorva: 'atorvastatin',
  lipitor: 'atorvastatin',
  paracetamol: 'paracetamol',
  crocin: 'paracetamol',
  dolo: 'paracetamol',
  dolo650: 'paracetamol',
  calpol: 'paracetamol',
  acetaminophen: 'paracetamol',
  ibuprofen: 'ibuprofen',
  brufen: 'ibuprofen',
  combiflam: 'ibuprofen',
  ciprofloxacin: 'ciprofloxacin',
  cipro: 'ciprofloxacin',
  ciptol: 'ciprofloxacin',
  amoxicillin: 'amoxicillin',
  mox: 'amoxicillin',
  novamox: 'amoxicillin',
  augmentin: 'amoxicillin',
  ampicillin: 'ampicillin',
  azithromycin: 'azithromycin',
  azee: 'azithromycin',
  zithromax: 'azithromycin',
  omeprazole: 'omeprazole',
  omez: 'omeprazole',
  pantoprazole: 'pantoprazole',
  pantocid: 'pantoprazole',
  pan40: 'pantoprazole',
  sildenafil: 'sildenafil',
  viagra: 'sildenafil',
  nitroglycerin: 'nitroglycerin',
  sorbitrate: 'nitroglycerin',
  nitrostat: 'nitroglycerin',
  theophylline: 'theophylline',
  deriphyllin: 'theophylline',
  lisinopril: 'lisinopril',
  enalapril: 'enalapril',
  spironolactone: 'spironolactone',
  aldactone: 'spironolactone',
  digoxin: 'digoxin',
  lanoxin: 'digoxin',
  tramadol: 'tramadol',
  ultram: 'tramadol',
  cetirizine: 'cetirizine',
  cetzine: 'cetirizine',
  fluoxetine: 'fluoxetine',
  prozac: 'fluoxetine',
  methotrexate: 'methotrexate',
};

// Drug-Drug Interaction Rules Knowledge Matrix
const DDI_MATRIX: Array<{
  pair: [string, string];
  severity: SeverityLevel;
  mechanism: string;
  clinicalEffect: string;
  recommendation: string;
}> = [
  {
    pair: ['warfarin', 'aspirin'],
    severity: 'CRITICAL',
    mechanism: 'Dual antiplatelet and anticoagulant synergism impairs clotting cascade.',
    clinicalEffect: 'Severe gastrointestinal bleeding, intracranial hemorrhage, fatal hemorrhagic stroke.',
    recommendation: 'Strict contraindication unless explicitly monitored with daily INR under specialist supervision.',
  },
  {
    pair: ['clopidogrel', 'omeprazole'],
    severity: 'MODERATE',
    mechanism: 'Omeprazole inhibits CYP2C19, blocking activation of clopidogrel prodrug.',
    clinicalEffect: 'Reduced antiplatelet effectiveness; increased risk of recurrent myocardial infarction or stent thrombosis.',
    recommendation: 'Substitute omeprazole with pantoprazole (minimal CYP2C19 inhibition) or H2 blocker.',
  },
  {
    pair: ['sildenafil', 'nitroglycerin'],
    severity: 'CRITICAL',
    mechanism: 'Potentiation of nitric oxide-cGMP pathway causing profound systemic vasodilation.',
    clinicalEffect: 'Catastrophic, refractory hypotension; circulatory collapse; death.',
    recommendation: 'Absolute contraindication. Nitrates must not be administered within 24-48 hours of PDE-5 inhibitors.',
  },
  {
    pair: ['metformin', 'contrast'],
    severity: 'CRITICAL',
    mechanism: 'Iodinated contrast can cause acute renal failure leading to toxic metformin accumulation.',
    clinicalEffect: 'Life-threatening Lactic Acidosis (up to 50% mortality rate).',
    recommendation: 'Withhold metformin 48 hours prior to contrast imaging; resume only after renal function re-evaluation.',
  },
  {
    pair: ['ciprofloxacin', 'theophylline'],
    severity: 'CRITICAL',
    mechanism: 'Ciprofloxacin inhibits hepatic CYP1A2 metabolism of theophylline.',
    clinicalEffect: 'Theophylline toxicity: intractable seizures, cardiac arrhythmias, hypokalemia.',
    recommendation: 'Reduce theophylline dose by 50% and monitor serum levels, or switch to azithromycin.',
  },
  {
    pair: ['ibuprofen', 'aspirin'],
    severity: 'MODERATE',
    mechanism: 'Ibuprofen competitively blocks the COX-1 binding site before aspirin can irreversibly acetylate it.',
    clinicalEffect: 'Loss of cardioprotective effect of low-dose aspirin; heightened gastrointestinal ulceration risk.',
    recommendation: 'Take aspirin at least 30 minutes before ibuprofen, or use paracetamol for analgesia.',
  },
  {
    pair: ['lisinopril', 'spironolactone'],
    severity: 'MODERATE',
    mechanism: 'Concurrent ACE inhibitor and potassium-sparing diuretic inhibits aldosterone-mediated potassium excretion.',
    clinicalEffect: 'Severe Hyperkalemia (serum K+ > 5.5 mEq/L) leading to fatal cardiac dysrhythmias.',
    recommendation: 'Monitor serum potassium and creatinine within 1 week of co-prescription.',
  },
  {
    pair: ['methotrexate', 'ibuprofen'],
    severity: 'CRITICAL',
    mechanism: 'NSAIDs decrease renal clearance of methotrexate via organic anion transporter inhibition.',
    clinicalEffect: 'Severe methotrexate toxicity: severe bone marrow suppression, leukopenia, nephrotoxicity.',
    recommendation: 'Avoid concurrent administration; use alternative analgesics monitored by oncologist.',
  },
  {
    pair: ['atorvastatin', 'ciprofloxacin'],
    severity: 'MODERATE',
    mechanism: 'CYP3A4 inhibition elevates serum statin concentrations.',
    clinicalEffect: 'Increased risk of myopathy and acute rhabdomyolysis.',
    recommendation: 'Temporarily pause statin during antibiotic course or use rosuvastatin.',
  },
  {
    pair: ['paracetamol', 'warfarin'],
    severity: 'LOW',
    mechanism: 'High-dose paracetamol (>2g/day) may inhibit warfarin metabolism via vitamin K antagonism.',
    clinicalEffect: 'Moderate elevation of INR with prolonged concurrent administration.',
    recommendation: 'Limit paracetamol to <2g/day; monitor INR if taken consistently for >3 days.',
  },
  {
    pair: ['tramadol', 'fluoxetine'],
    severity: 'CRITICAL',
    mechanism: 'Synergistic serotonin reuptake inhibition plus CYP2D6 inhibition by fluoxetine.',
    clinicalEffect: 'Serotonin Syndrome (hyperthermia, clonus, autonomic instability) and lowered seizure threshold.',
    recommendation: 'Avoid combination. Consider alternative pain management.',
  },
];

// Allergy Cross-Reactivity Database
const ALLERGY_MATRIX: Array<{
  allergenClass: RegExp;
  triggers: RegExp[];
  severity: SeverityLevel;
  clinicalEffect: string;
  recommendation: string;
}> = [
  {
    allergenClass: /penicillin|amoxicillin|ampicillin|beta-lactam/i,
    triggers: [/amoxicillin/i, /ampicillin/i, /penicillin/i, /augmentin/i, /novamox/i, /mox/i, /piperacillin/i],
    severity: 'CRITICAL',
    clinicalEffect: 'Anaphylactic shock, bronchospasm, severe urticaria, angioedema.',
    recommendation: 'Absolute contraindication. Substitute with macrolides (e.g., Azithromycin) or fluoroquinolones.',
  },
  {
    allergenClass: /sulfa|sulfonamide/i,
    triggers: [/sulfamethoxazole/i, /bactrim/i, /septra/i, /furosemide/i, /glimepiride/i],
    severity: 'CRITICAL',
    clinicalEffect: 'Stevens-Johnson Syndrome (SJS), Toxic Epidermal Necrolysis (TEN), drug-induced rash.',
    recommendation: 'Avoid sulfonamide-containing antibiotics and monitor related compounds.',
  },
  {
    allergenClass: /nsaid|aspirin|ibuprofen/i,
    triggers: [/aspirin/i, /ibuprofen/i, /brufen/i, /diclofenac/i, /combiflam/i, /naproxen/i],
    severity: 'MODERATE',
    clinicalEffect: 'Aspirin-exacerbated respiratory disease (AERD), severe bronchospasm, gastrointestinal bleeding.',
    recommendation: 'Use Paracetamol or selective COX-2 inhibitor with clinician observation.',
  },
  {
    allergenClass: /statin|atorvastatin/i,
    triggers: [/atorvastatin/i, /simvastatin/i, /rosuvastatin/i],
    severity: 'MODERATE',
    clinicalEffect: 'Severe myalgia, elevated creatine kinase, rhabdomyolysis.',
    recommendation: 'Consider non-statin lipid-lowering therapies (e.g., Ezetimibe or PCSK9 inhibitors).',
  },
];

export function normalizeMedicationName(raw: string): string {
  const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [alias, canonical] of Object.entries(MEDICATION_ALIASES)) {
    if (clean.includes(alias.replace(/[^a-z0-9]/g, ''))) {
      return canonical;
    }
  }
  return raw.toLowerCase().trim();
}

export function checkDrugInteractions(medicationNames: string[]): DrugInteractionAlert[] {
  const normalized = medicationNames.map(normalizeMedicationName).filter(Boolean);
  const uniqueMeds = [...new Set(normalized)];
  const alerts: DrugInteractionAlert[] = [];

  for (let i = 0; i < uniqueMeds.length; i++) {
    for (let j = i + 1; j < uniqueMeds.length; j++) {
      const medA = uniqueMeds[i];
      const medB = uniqueMeds[j];
      if (!medA || !medB) continue;

      const drugAName = medicationNames[i] ?? medA;
      const drugBName = medicationNames[j] ?? medB;

      for (const rule of DDI_MATRIX) {
        const matches1 = (medA.includes(rule.pair[0]) && medB.includes(rule.pair[1])) ||
                         (medA.includes(rule.pair[1]) && medB.includes(rule.pair[0]));
        if (matches1) {
          alerts.push({
            drugA: drugAName,
            drugB: drugBName,
            severity: rule.severity,
            mechanism: rule.mechanism,
            clinicalEffect: rule.clinicalEffect,
            recommendation: rule.recommendation,
          });
        }
      }
    }
  }

  return alerts;
}

export function checkAllergyConflicts(medicationNames: string[], patientAllergies: string[]): AllergyConflictAlert[] {
  const alerts: AllergyConflictAlert[] = [];

  for (const allergy of patientAllergies) {
    const allergyClean = allergy.trim();
    if (!allergyClean) continue;

    for (const rule of ALLERGY_MATRIX) {
      if (rule.allergenClass.test(allergyClean)) {
        for (const med of medicationNames) {
          const medClean = med.trim();
          const isTrigger = rule.triggers.some((trigger) => trigger.test(medClean));
          if (isTrigger) {
            alerts.push({
              medication: medClean,
              allergen: allergyClean,
              severity: rule.severity,
              clinicalEffect: rule.clinicalEffect,
              recommendation: rule.recommendation,
            });
          }
        }
      }
    }
  }

  return alerts;
}

export function evaluatePrescriptionSafety(
  prescribedMeds: string[],
  existingMeds: string[] = [],
  patientAllergies: string[] = []
): SafetyEvaluationResult {
  const combinedMeds = [...new Set([...prescribedMeds, ...existingMeds])];
  const interactionAlerts = checkDrugInteractions(combinedMeds);
  const allergyAlerts = checkAllergyConflicts(prescribedMeds, patientAllergies);

  const hasCritical = interactionAlerts.some((a) => a.severity === 'CRITICAL') ||
                      allergyAlerts.some((a) => a.severity === 'CRITICAL');

  // Calculate safety score (100 is perfect, deductions for risks)
  let score = 100;
  for (const a of interactionAlerts) {
    score -= a.severity === 'CRITICAL' ? 35 : a.severity === 'MODERATE' ? 15 : 5;
  }
  for (const a of allergyAlerts) {
    score -= a.severity === 'CRITICAL' ? 45 : 20;
  }
  score = Math.max(0, Math.min(100, score));

  let summary = 'Prescription passed all clinical interaction and allergy checks.';
  if (hasCritical) {
    summary = 'CRITICAL CLINICAL ALERT: Dangerous drug interaction or allergen contraindication detected. Requires immediate clinician revision.';
  } else if (interactionAlerts.length > 0 || allergyAlerts.length > 0) {
    summary = 'MODERATE CAUTION: Drug interaction or mild sensitivity identified. Clinician review recommended.';
  }

  return {
    hasCriticalAlerts: hasCritical,
    interactionAlerts,
    allergyAlerts,
    safetyScore: score,
    safetySummary: summary,
  };
}
