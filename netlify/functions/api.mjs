// Netlify Serverless Function for MediBridge AI API
// Handles /api/* routes directly on https://medibridge2ai.netlify.app

const DDI_RULES = [
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
];

const ALLERGY_RULES = [
  {
    allergenClass: /penicillin|amoxicillin|ampicillin|beta-lactam/i,
    triggers: [/amoxicillin/i, /ampicillin/i, /penicillin/i, /augmentin/i, /novamox/i, /mox/i],
    severity: 'CRITICAL',
    clinicalEffect: 'Anaphylactic shock, bronchospasm, severe urticaria, angioedema.',
    recommendation: 'Absolute contraindication. Substitute with macrolides (e.g., Azithromycin) or fluoroquinolones.',
  },
  {
    allergenClass: /sulfa|sulfonamide/i,
    triggers: [/sulfamethoxazole/i, /bactrim/i, /septra/i],
    severity: 'CRITICAL',
    clinicalEffect: 'Stevens-Johnson Syndrome (SJS), Toxic Epidermal Necrolysis (TEN).',
    recommendation: 'Avoid sulfonamide-containing antibiotics.',
  },
  {
    allergenClass: /nsaid|aspirin|ibuprofen/i,
    triggers: [/aspirin/i, /ibuprofen/i, /brufen/i, /diclofenac/i, /combiflam/i],
    severity: 'MODERATE',
    clinicalEffect: 'Aspirin-exacerbated respiratory disease (AERD), severe bronchospasm.',
    recommendation: 'Use Paracetamol with clinician observation.',
  },
];

function evaluateSafety(prescribedMeds = [], existingMeds = [], allergies = []) {
  const allMeds = [...new Set([...prescribedMeds, ...existingMeds])];
  const interactionAlerts = [];
  const allergyAlerts = [];

  for (let i = 0; i < allMeds.length; i++) {
    for (let j = i + 1; j < allMeds.length; j++) {
      const a = allMeds[i].toLowerCase();
      const b = allMeds[j].toLowerCase();
      for (const rule of DDI_RULES) {
        if ((a.includes(rule.pair[0]) && b.includes(rule.pair[1])) || (a.includes(rule.pair[1]) && b.includes(rule.pair[0]))) {
          interactionAlerts.push({
            drugA: allMeds[i],
            drugB: allMeds[j],
            severity: rule.severity,
            mechanism: rule.mechanism,
            clinicalEffect: rule.clinicalEffect,
            recommendation: rule.recommendation,
          });
        }
      }
    }
  }

  for (const allergy of allergies) {
    for (const rule of ALLERGY_RULES) {
      if (rule.allergenClass.test(allergy)) {
        for (const med of prescribedMeds) {
          if (rule.triggers.some((rx) => rx.test(med))) {
            allergyAlerts.push({
              medication: med,
              allergen: allergy,
              severity: rule.severity,
              clinicalEffect: rule.clinicalEffect,
              recommendation: rule.recommendation,
            });
          }
        }
      }
    }
  }

  const hasCritical = interactionAlerts.some((x) => x.severity === 'CRITICAL') || allergyAlerts.some((x) => x.severity === 'CRITICAL');
  let score = 100 - (interactionAlerts.length * 20 + allergyAlerts.length * 35);
  score = Math.max(10, Math.min(100, score));

  return {
    hasCriticalAlerts: hasCritical,
    interactionAlerts,
    allergyAlerts,
    safetyScore: score,
    safetySummary: hasCritical
      ? 'CRITICAL CLINICAL ALERT: Dangerous drug interaction or allergen contraindication detected. Requires immediate clinician revision.'
      : interactionAlerts.length > 0
      ? 'MODERATE CAUTION: Drug interaction detected. Clinician review recommended.'
      : 'Prescription passed all clinical interaction and allergy checks.',
  };
}

// In-Memory Synchronized Demo State for Netlify Serverless
const DEMO_PATIENTS = [
  {
    id: 'pat-1001',
    patientCode: 'MB-P-1001',
    name: 'Ravi Kumar',
    age: 54,
    gender: 'Male',
    preferredLanguage: 'Tamil',
    phone: '+91 98401 23456',
    allergies: [{ id: 'alg-1', substance: 'Penicillin', reaction: 'Severe Urticaria / Anaphylaxis', severity: 'HIGH' }],
    diagnoses: [{ id: 'diag-1', name: 'Type 2 Diabetes', status: 'ACTIVE', source: 'DOCTOR_RECORDED', recordedAt: '2025-11-10T09:30:00Z' }],
    patientMedications: [
      { id: 'pm-1', medication: { name: 'Metformin' }, dosage: '500 mg', frequency: 'Twice daily (with meals)', status: 'ACTIVE', startedAt: '2025-11-10T09:30:00Z' },
      { id: 'pm-2', medication: { name: 'Amlodipine' }, dosage: '5 mg', frequency: 'Once daily (morning)', status: 'ACTIVE', startedAt: '2026-01-15T09:30:00Z' },
    ],
    symptoms: [{ id: 'sym-1', name: 'Fever', duration: '3 days', severity: 'Moderate', reportedAt: '2026-08-01T09:30:00Z' }],
    labResults: [
      { id: 'lab-1', labTest: { name: 'HbA1c', unit: '%' }, value: '7.4', unit: '%', resultDate: '2026-07-20T09:30:00Z' },
      { id: 'lab-2', labTest: { name: 'Fasting Blood Glucose', unit: 'mg/dL' }, value: '132', unit: 'mg/dL', resultDate: '2026-07-20T09:30:00Z' },
    ],
    consultations: [
      { id: 'con-1', consultationDate: '2026-08-05T09:30:00Z', chiefComplaint: 'Follow-up for glycemic monitoring & acute fever', clinicalNotes: 'Patient adhering to Metformin. Mild fever noted. Advised rest.', doctor: { user: { name: 'Dr. Priya Raman' }, specialization: 'General Medicine' } }
    ],
    medicalDocuments: [
      { id: 'doc-1', originalName: 'Apollo_Prescription_August.pdf', documentType: 'PRESCRIPTION', status: 'APPROVED', uploadedAt: '2026-08-05T09:30:00Z' },
      { id: 'doc-2', originalName: 'Thyrocare_HbA1c_Lab_Report.pdf', documentType: 'LAB_REPORT', status: 'APPROVED', uploadedAt: '2026-07-20T09:30:00Z' },
    ],
    voiceSessions: [],
    clinicalSummaries: [],
  },
  {
    id: 'pat-1002',
    patientCode: 'MB-P-1002',
    name: 'Meena Devi',
    age: 42,
    gender: 'Female',
    preferredLanguage: 'Tamil',
    phone: '+91 94441 56789',
    allergies: [],
    diagnoses: [{ id: 'diag-2', name: 'Hypertension', status: 'ACTIVE', source: 'DOCTOR_RECORDED', recordedAt: '2026-04-11T09:30:00Z' }],
    patientMedications: [{ id: 'pm-3', medication: { name: 'Telmisartan' }, dosage: '40 mg', frequency: 'Once daily', status: 'ACTIVE', startedAt: '2026-04-11T09:30:00Z' }],
    symptoms: [],
    labResults: [],
    consultations: [],
    medicalDocuments: [],
    voiceSessions: [],
    clinicalSummaries: [],
  },
  {
    id: 'pat-1003',
    patientCode: 'MB-P-1003',
    name: 'Aarav Sharma',
    age: 31,
    gender: 'Male',
    preferredLanguage: 'Hindi',
    phone: '+91 98110 12345',
    allergies: [],
    diagnoses: [],
    patientMedications: [],
    symptoms: [],
    labResults: [],
    consultations: [],
    medicalDocuments: [],
    voiceSessions: [],
    clinicalSummaries: [],
  },
  {
    id: 'pat-1004',
    patientCode: 'MB-P-1004',
    name: 'Lakshmi Reddy',
    age: 63,
    gender: 'Female',
    preferredLanguage: 'Telugu',
    phone: '+91 98490 67890',
    allergies: [],
    diagnoses: [{ id: 'diag-3', name: 'Asthma', status: 'ACTIVE', source: 'DOCTOR_RECORDED', recordedAt: '2026-03-20T09:30:00Z' }],
    patientMedications: [{ id: 'pm-4', medication: { name: 'Asthalin Inhaler' }, dosage: '100 mcg', frequency: 'PRN', status: 'ACTIVE', startedAt: '2026-03-20T09:30:00Z' }],
    symptoms: [],
    labResults: [],
    consultations: [],
    medicalDocuments: [],
    voiceSessions: [],
    clinicalSummaries: [],
  },
  {
    id: 'pat-1005',
    patientCode: 'MB-P-1005',
    name: 'Daniel Joseph',
    age: 27,
    gender: 'Male',
    preferredLanguage: 'English',
    phone: '+91 98840 98765',
    allergies: [],
    diagnoses: [],
    patientMedications: [],
    symptoms: [],
    labResults: [],
    consultations: [],
    medicalDocuments: [],
    voiceSessions: [],
    clinicalSummaries: [],
  },
];

const DEMO_USERS = {
  'patient@medibridge.ai': { id: 'usr-1', name: 'Ravi Kumar', email: 'patient@medibridge.ai', role: 'PATIENT', patientId: 'pat-1001' },
  'doctor@medibridge.ai': { id: 'usr-2', name: 'Dr. Priya Raman', email: 'doctor@medibridge.ai', role: 'DOCTOR' },
  'admin@medibridge.ai': { id: 'usr-3', name: 'MediBridge Admin', email: 'admin@medibridge.ai', role: 'ADMIN' },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export default async function handler(req, context) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const url = new URL(req.url);
  // Normalize path removing /.netlify/functions/api or /api prefix
  let path = url.pathname.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');
  if (!path.startsWith('/')) path = '/' + path;

  try {
    // 1. Health check
    if (path === '/health') {
      return json({ status: 'ok', service: 'MediBridge AI Serverless API', online: true });
    }

    // 2. Auth: Login
    if (path === '/auth/login' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      let identifier = String(body.username || body.email || '').trim().toLowerCase();
      if (identifier === 'doctor') identifier = 'doctor@medibridge.ai';
      if (identifier === 'patient') identifier = 'patient@medibridge.ai';
      if (identifier === 'admin') identifier = 'admin@medibridge.ai';
      if (identifier === 'mb-p-1001') identifier = 'patient@medibridge.ai';

      const user = DEMO_USERS[identifier] || {
        id: 'usr-auto',
        name: identifier.split('@')[0] || 'Demo User',
        email: identifier.includes('@') ? identifier : `${identifier}@medibridge.ai`,
        role: identifier.includes('doc') ? 'DOCTOR' : identifier.includes('admin') ? 'ADMIN' : 'PATIENT',
        patientId: 'pat-1001',
      };
      return json({ token: 'mb_demo_token_' + Date.now(), user });
    }

    // 3. Auth: Current user
    if (path === '/auth/me') {
      return json(DEMO_USERS['doctor@medibridge.ai']);
    }

    // 4. Patients: Get Me
    if (path === '/patients/me') {
      return json(DEMO_PATIENTS[0]);
    }

    // 5. Patients: List
    if (path === '/patients' && req.method === 'GET') {
      const q = url.searchParams.get('q')?.toLowerCase() || '';
      const list = DEMO_PATIENTS.filter((p) => !q || p.name.toLowerCase().includes(q) || p.patientCode.toLowerCase().includes(q));
      return json(list);
    }

    // 6. Emergency Health Card with QR
    const emergMatch = path.match(/^\/patients\/([^/]+)\/emergency-card$/);
    if (emergMatch) {
      const p = DEMO_PATIENTS.find((x) => x.id === emergMatch[1]) || DEMO_PATIENTS[0];
      return json({
        patientCode: p.patientCode,
        name: p.name,
        age: p.age,
        gender: p.gender,
        preferredLanguage: p.preferredLanguage,
        chronicConditions: p.diagnoses?.map((d) => d.name) || [],
        criticalAllergies: p.allergies?.map((a) => a.substance) || [],
        currentMedications: p.patientMedications?.map((m) => `${m.medication.name} (${m.dosage || ''})`) || [],
      });
    }

    // 7. Patient Details
    const patMatch = path.match(/^\/patients\/([^/]+)$/);
    if (patMatch && req.method === 'GET') {
      const p = DEMO_PATIENTS.find((x) => x.id === patMatch[1]) || DEMO_PATIENTS[0];
      return json(p);
    }

    // 8. Patient Timeline
    const timelineMatch = path.match(/^\/patients\/([^/]+)\/timeline$/);
    if (timelineMatch) {
      const p = DEMO_PATIENTS.find((x) => x.id === timelineMatch[1]) || DEMO_PATIENTS[0];
      const events = [
        ...p.consultations.map((c) => ({ id: `c-${c.id}`, type: 'Consultations', date: c.consultationDate, title: 'Consultation', detail: c.chiefComplaint || 'Clinical evaluation' })),
        ...p.symptoms.map((s) => ({ id: `s-${s.id}`, type: 'Symptoms', date: s.reportedAt, title: s.name, detail: `${s.duration || ''} • ${s.severity || ''}` })),
        ...p.diagnoses.map((d) => ({ id: `d-${d.id}`, type: 'Diagnoses', date: d.recordedAt, title: 'Diagnosis / Condition', detail: d.name })),
        ...p.patientMedications.map((m) => ({ id: `m-${m.id}`, type: 'Medicines', date: m.startedAt, title: 'Medication', detail: `${m.medication.name} • ${m.dosage || ''}` })),
        ...p.labResults.map((l) => ({ id: `l-${l.id}`, type: 'Lab Tests', date: l.resultDate, title: l.labTest.name, detail: `${l.value} ${l.unit}` })),
      ];
      return json(events);
    }

    // 9. Patient Graph
    const graphMatch = path.match(/^\/patients\/([^/]+)\/graph$/);
    if (graphMatch) {
      const p = DEMO_PATIENTS.find((x) => x.id === graphMatch[1]) || DEMO_PATIENTS[0];
      const root = `patient-${p.id}`;
      const nodes = [{ id: root, type: 'patient', label: p.name, subtitle: p.patientCode }];
      const edges = [];
      p.diagnoses.forEach((d) => {
        nodes.push({ id: `diag-${d.id}`, type: 'condition', label: d.name });
        edges.push({ id: `e-${root}-d`, source: root, target: `diag-${d.id}`, label: 'HAS_CONDITION' });
      });
      p.patientMedications.forEach((m) => {
        nodes.push({ id: `med-${m.id}`, type: 'medication', label: m.medication.name, subtitle: m.dosage });
        edges.push({ id: `e-${root}-m`, source: root, target: `med-${m.id}`, label: 'TAKES_MEDICATION' });
      });
      p.allergies.forEach((a) => {
        nodes.push({ id: `alg-${a.id}`, type: 'allergy', label: a.substance });
        edges.push({ id: `e-${root}-a`, source: root, target: `alg-${a.id}`, label: 'HAS_ALLERGY' });
      });
      return json({ nodes, edges });
    }

    // 10. Patient Summary
    const sumMatch = path.match(/^\/patients\/([^/]+)\/summary$/);
    if (sumMatch) {
      const p = DEMO_PATIENTS.find((x) => x.id === sumMatch[1]) || DEMO_PATIENTS[0];
      const summaryText = [
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `PATIENT CLINICAL PRE-CONSULTATION SYNTHESIS`,
        `Patient: ${p.name} (${p.patientCode}) | ${p.age} yrs ${p.gender} | Preferred: ${p.preferredLanguage}`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `\n1. CHRONIC CONDITIONS:`,
        p.diagnoses.map((d) => `  • ${d.name}`).join('\n'),
        `\n2. ACTIVE PHARMACOTHERAPY:`,
        p.patientMedications.map((m) => `  • ${m.medication.name} (${m.dosage})`).join('\n'),
        `\n3. ALLERGY CONTRAINDICATIONS:`,
        p.allergies.map((a) => `  • ⚠️ ${a.substance} (${a.reaction})`).join('\n') || '  • None recorded.',
        `\n4. RECENT LABS:`,
        p.labResults.map((l) => `  • ${l.labTest.name}: ${l.value}${l.unit}`).join('\n'),
        `\n5. CLINICAL RISK ASSESSMENT:`,
        `  • Suboptimal Glycemic Control: Last HbA1c is 7.4%. Advise medication titration.`,
        `  • Clinical Safety Score: 90/100`,
      ].join('\n');
      return json({ id: 'sum-1', summaryText, approved: true, createdAt: new Date().toISOString() });
    }

    // 11. Stats Dashboard
    if (path === '/stats/dashboard') {
      return json({
        patients: DEMO_PATIENTS.length,
        consultations: 14,
        documents: 9,
        voiceSessions: 6,
        pendingVoiceSessions: 1,
      });
    }

    // 12. Voice Extraction with Safety HUD
    if (path === '/voice/extract' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const text = String(body.text || '');
      const patientId = body.patientId;
      const targetPatient = DEMO_PATIENTS.find((p) => p.id === patientId) || DEMO_PATIENTS[0];

      const symptoms = [];
      if (/fever|காய்ச்சல்|bukhar/i.test(text)) symptoms.push({ name: 'Fever', duration: '3 days', severity: 'Moderate' });
      if (/breath|moochu|saans/i.test(text)) symptoms.push({ name: 'Breathing difficulty', duration: '1 day', severity: 'Moderate' });
      if (/cough|irumal|khansi/i.test(text)) symptoms.push({ name: 'Cough', duration: '2 days', severity: 'Mild' });
      if (/headache|thalai/i.test(text)) symptoms.push({ name: 'Headache', duration: '2 days', severity: 'Severe' });

      const conditions = [];
      if (/sugar|diabetes|நீரிழிவு/i.test(text)) conditions.push({ name: 'Type 2 Diabetes' });
      if (/bp|hypertension|blood pressure/i.test(text)) conditions.push({ name: 'Hypertension' });

      const medications = [];
      if (/metformin/i.test(text)) medications.push({ name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily', duration: '30 days' });
      if (/amoxicillin/i.test(text)) medications.push({ name: 'Amoxicillin', dosage: '500 mg', frequency: 'Twice daily', duration: '5 days' });
      if (/aspirin/i.test(text)) medications.push({ name: 'Aspirin', dosage: '75 mg', frequency: 'Once daily', duration: '30 days' });
      if (/warfarin/i.test(text)) medications.push({ name: 'Warfarin', dosage: '2.5 mg', frequency: 'Once daily', duration: '30 days' });
      if (/ibuprofen/i.test(text)) medications.push({ name: 'Ibuprofen', dosage: '400 mg', frequency: 'Twice daily', duration: '3 days' });

      const allergies = [];
      if (/penicillin/i.test(text)) allergies.push({ substance: 'Penicillin', reaction: 'Severe rash' });

      const existingMeds = targetPatient.patientMedications.map((m) => m.medication.name);
      const existingAllergies = targetPatient.allergies.map((a) => a.substance);
      const prescribedMedNames = medications.map((m) => m.name);

      const safetyEvaluation = evaluateSafety(prescribedMedNames, existingMeds, [...allergies.map((a) => a.substance), ...existingAllergies]);

      return json({
        chiefComplaint: symptoms.map((s) => s.name).join(', ') || 'General consultation',
        symptoms,
        conditions,
        previousTreatments: [],
        medications,
        allergies,
        relevantHistory: conditions.map((c) => `${c.name} reported by patient`),
        followUpQuestions: [
          'What was the highest measured temperature?',
          'Are any shortness of breath or chills also present?',
          'Are there any known drug allergies or adverse reactions?',
        ],
        safetyEvaluation,
      });
    }

    // 13. Voice Save
    if (path === '/voice/save' && req.method === 'POST') {
      return json({ success: true, message: 'Voice session reviewed and persisted.' });
    }

    // 14. Document Extraction with Safety HUD
    if (path === '/documents/extract' && req.method === 'POST') {
      const today = new Date().toISOString().split('T')[0];
      const targetPatient = DEMO_PATIENTS[0];
      let sampleId = '';
      let text = '';
      let fileName = '';

      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await req.json().catch(() => ({}));
        sampleId = body.sampleId || '';
        text = body.text || '';
      } else if (contentType.includes('multipart/form-data')) {
        const fd = await req.formData().catch(() => null);
        if (fd) {
          const file = fd.get('document');
          if (file && typeof file === 'object') {
            fileName = file.name || '';
          }
          sampleId = String(fd.get('sampleId') || '');
          text = String(fd.get('text') || '');
        }
      }

      let extraction;
      const lower = (sampleId + ' ' + fileName + ' ' + text).toLowerCase();

      if (lower.includes('warfarin') || lower.includes('aspirin') || sampleId === 'warfarin-hazard') {
        extraction = {
          patientName: targetPatient.name,
          doctorName: 'Dr. Arvind Swaminathan, MD, DM (Cardiology)',
          hospital: 'Madras Heart Institute, Chennai',
          date: today,
          diagnosisRecorded: ['Deep Vein Thrombosis Prophylaxis', 'Severe Knee Arthralgia'],
          medicines: [
            { name: 'Warfarin Sodium', dosage: '2.5 mg', frequency: 'Once daily (7 PM, per INR)', duration: '30 days' },
            { name: 'Ecosprin (Aspirin)', dosage: '75 mg', frequency: 'Once daily (after lunch)', duration: '30 days' },
            { name: 'Ibuprofen', dosage: '400 mg', frequency: 'Twice daily (after food)', duration: '5 days' },
          ],
          labTests: [{ name: 'PT / INR', value: '2.4', unit: 'INR', referenceRange: '2.0 - 3.0 Therapeutic' }],
          allergies: [],
          followUpDate: '2026-10-22',
          note: 'Multi-drug therapy analyzed. CRITICAL DRUG-DRUG INTERACTION: Warfarin combined with Aspirin and Ibuprofen impairs primary and secondary hemostasis.',
        };
      } else if (lower.includes('metformin') || sampleId === 'clean-diabetic') {
        extraction = {
          patientName: targetPatient.name,
          doctorName: 'Dr. Priya Raman, MBBS, MD',
          hospital: 'MediBridge Primary Healthcare Clinic',
          date: today,
          diagnosisRecorded: ['Type 2 Diabetes Mellitus', 'Mild Dyspepsia'],
          medicines: [
            { name: 'Metformin HCl', dosage: '500 mg', frequency: 'Twice daily (with meals)', duration: '30 days' },
            { name: 'Pantoprazole', dosage: '40 mg', frequency: 'Once daily (empty stomach, morning)', duration: '14 days' },
          ],
          labTests: [
            { name: 'HbA1c', value: '7.4', unit: '%', referenceRange: '<5.7% Normal' },
            { name: 'Fasting Blood Glucose', value: '132', unit: 'mg/dL', referenceRange: '70-99 mg/dL' },
          ],
          allergies: [],
          followUpDate: '2026-11-05',
          note: 'Routine chronic prescription verified safe. 100/100 Safety Score.',
        };
      } else {
        // Default / Case 1: Penicillin Allergy Interception (Amoxicillin)
        extraction = {
          patientName: targetPatient.name,
          doctorName: 'Dr. Priya Raman, MBBS, MD',
          hospital: 'Apollo Multispecialty Hospitals, Chennai',
          date: today,
          diagnosisRecorded: ['Acute Streptococcal Pharyngitis', 'Pyrexia'],
          medicines: [
            { name: 'Amoxicillin + Clavulanate (Augmentin)', dosage: '625 mg', frequency: 'Twice daily (after food)', duration: '5 days' },
            { name: 'Paracetamol (Dolo 650)', dosage: '650 mg', frequency: 'Thrice daily if fever >100°F', duration: '3 days' },
            { name: 'Pantoprazole', dosage: '40 mg', frequency: 'Once daily (empty stomach, morning)', duration: '5 days' },
          ],
          labTests: [
            { name: 'Fasting Blood Sugar', value: '138', unit: 'mg/dL', referenceRange: '70-99 mg/dL' },
          ],
          allergies: [{ substance: 'Penicillin', reaction: 'Severe anaphylactic urticaria & bronchospasm' }],
          followUpDate: '2026-10-15',
          note: 'Prescription scanned via Optical Vision AI. CRITICAL CONTRAINDICATION: Patient EHR records severe Penicillin allergy. Amoxicillin cross-reacts with Penicillin beta-lactam core.',
        };
      }

      const prescribedMedNames = extraction.medicines.map((m) => m.name);
      const existingMeds = targetPatient.patientMedications.map((m) => m.medication.name);
      const existingAllergies = targetPatient.allergies.map((a) => a.substance);

      extraction.safetyEvaluation = evaluateSafety(prescribedMedNames, existingMeds, existingAllergies);

      return json({
        document: {
          id: 'doc-live-' + Date.now(),
          originalName: fileName || (sampleId ? `${sampleId}.pdf` : 'Live_Captured_Prescription.jpg'),
          documentType: 'PRESCRIPTION',
          status: 'PENDING_REVIEW',
        },
        extracted: extraction,
      });
    }

    // 15. Document Approve
    if (path.includes('/approve') && req.method === 'POST') {
      return json({ success: true, message: 'Approved & committed to patient EHR.' });
    }

    return json({ message: `Route ${path} not found` }, 404);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export const config = {
  path: '/api/*',
};
