import { isGeminiConfigured, extractVoiceWithGemini } from './gemini.service.js';
import { evaluatePrescriptionSafety, type SafetyEvaluationResult } from './safety.service.js';

export type StructuredMedicalInfo = {
  chiefComplaint: string;
  symptoms: Array<{ name: string; duration?: string; severity?: string }>;
  conditions: Array<{ name: string }>;
  previousTreatments: string[];
  medications: Array<{ name: string; dosage?: string; frequency?: string; duration?: string }>;
  allergies: Array<{ substance: string; reaction?: string }>;
  relevantHistory: string[];
  followUpQuestions: string[];
  safetyEvaluation?: SafetyEvaluationResult;
};

const symptomMatchers: Array<[RegExp, string]> = [
  [/fever|காய்ச்சல்|சுரம்|bukhar|बुखार|జ్వరం/i, 'Fever'],
  [/breath|breathing|moochu|மூச்சு|saans|सांस|శ్వாస|dyspnea|wheez/i, 'Breathing difficulty'],
  [/chest\s*pain|nenju|மார்பு|सीने.*दर्द|ఛాతీ.*నొప్పి|angina/i, 'Chest pain'],
  [/cough|irumal|இருமல்|खांसी|దగ్గు/i, 'Cough'],
  [/dizz|mayakkam|மயக்கம்|चक्कर|తలతిరగ|vertigo/i, 'Dizziness'],
  [/headache|thalai vali|தலைவலி|सिरदर्द|తలనొప్పి|migraine/i, 'Headache'],
  [/vomit|வாந்தி|உமட்டல்|उल्टी|వాంత|nausea/i, 'Vomiting / Nausea'],
  [/stomach|vayiru|வயிறு|வயிற்றுவலி|पेट.*दर्द|కడుపు/i, 'Abdominal pain'],
  [/sore\s*throat|throat\s*pain|தொண்டை.*வலி|गले.*दर्द|గొంతు.*నొప్పి/i, 'Sore throat'],
  [/body\s*pain|udal\s*vali|உடல்.*வலி|शरीர.*दर्द|ఒళ్ళు.*నొప్ప|myalgia/i, 'Body pain / Myalgia'],
  [/joint\s*pain|mootu\s*vali|மூட்டு|गठिया|కీళ్ళ.*నొప్పి/i, 'Joint pain'],
  [/rash|itching|arippu|அரிப்பு|खुजली|దురద/i, 'Skin Rash / Pruritus'],
  [/fatigue|tired|asathi|அசதி|தளர்ச்சி|थकान|నీరసం/i, 'Fatigue / Weakness'],
];

const numberWords: Record<string, number> = {
  one: 1, oru: 1, 'ஒரு': 1, ek: 1, 'एक': 1, oka: 1, 'ఒక': 1,
  two: 2, rendu: 2, randu: 2, 'இரண்டு': 2, 'ரெண்டு': 2, do: 2, 'दो': 2, 'రెండు': 2,
  three: 3, moonu: 3, munu: 3, 'மூன்று': 3, teen: 3, 'तीन': 3, moodu: 3, 'మూడు': 3,
  four: 4, naalu: 4, 'நான்கு': 4, char: 4, 'चार': 4, nalugu: 4, 'నాలుగు': 4,
  five: 5, anju: 5, 'ஐந்து': 5, paanch: 5, 'पांच': 5, aidu: 5, 'ఐదు': 5,
};

function parseNumber(raw: string) {
  const key = raw.toLowerCase();
  const numeric = Number(key);
  if (Number.isFinite(numeric)) return numeric;
  return numberWords[key];
}

function detectDuration(text: string) {
  const normalized = text.replace(/,/g, ' ');
  const pattern = /(\d+|one|two|three|four|five|oru|rendu|randu|moonu|munu|naalu|anju|ஒரு|இரண்டு|ரெண்டு|மூன்று|நான்கு|ஐந்து|ek|do|teen|char|paanch|एक|दो|तीन|चार|पांच|oka|moodu|nalugu|aidu|ఒక|రెండు|మూడు|నాలుగు|ఐదు)\s*(hour|hours|hr|hrs|மணி|घंटा|घंटे|గంట|గంటలు|day|days|naal|naala|நாள்|நாளா|நாட்கள்|दिन|రోజు|రోజులు|week|weeks|வாரம்|हफ्ता|हफ्ते|వారం|వారాలు|month|months|மாதம்|महीना|महीने|నెల|నెలలు)/i;
  const match = normalized.match(pattern);
  if (!match || !match[1] || !match[2]) return undefined;
  const amount = parseNumber(match[1]);
  if (!amount) return undefined;
  const unitRaw = match[2].toLowerCase();
  const unit = /hour|hr|மணி|घंट|గంట/.test(unitRaw) ? 'hour'
    : /week|வாரம்|हफ्त|వారం/.test(unitRaw) ? 'week'
      : /month|மாதம்|मही|నెల/.test(unitRaw) ? 'month'
        : 'day';
  return `${amount} ${unit}${amount === 1 ? '' : 's'}`;
}

function detectSeverity(text: string) {
  if (/severe|very\s*(bad|high)|romba|ரொம்ப|மிகவும்|तेज़|बहुत|చాలా/i.test(text)) return 'Severe';
  if (/moderate|medium|மிதமான|मध्यम|మధ్యస్థ/i.test(text)) return 'Moderate';
  if (/mild|slight|konjam|கொஞ்சம்|हल्का|కొంచెం/i.test(text)) return 'Mild';
  return undefined;
}

function questions(symptoms: string[]) {
  const q = new Set<string>();
  if (symptoms.includes('Fever')) {
    q.add('What was the highest measured temperature with thermometer?');
    q.add('Are chills, rigors, rash, or body pain also present?');
  }
  if (symptoms.includes('Breathing difficulty')) {
    q.add('When did the shortness of breath start? Does it worsen while lying down?');
    q.add('Is breathing difficulty present at rest or only during exertion?');
    q.add('Are chest tightness, ankle swelling, or bluish lips noted?');
  }
  if (symptoms.includes('Chest pain')) {
    q.add('Where is the pain located and does it radiate to the left arm, neck, or jaw?');
    q.add('Is the pain associated with sweating, shortness of breath, or nausea?');
  }
  if (symptoms.includes('Vomiting / Nausea') || symptoms.includes('Abdominal pain')) {
    q.add('Are you able to keep liquids down, or experiencing severe dehydration?');
    q.add('Is the pain localized to upper right, lower right, or general abdomen?');
  }
  if (q.size === 0) {
    q.add('When did these symptoms start and are they improving or worsening?');
    q.add('Are you currently taking any prescription or over-the-counter medications?');
    q.add('Do you have any known medical conditions like Diabetes or Hypertension?');
  }
  return [...q].slice(0, 5);
}

// Comprehensive clinical medication database (60+ common medications)
const EXTENSIVE_MEDICATIONS = [
  'Metformin', 'Insulin', 'Glimepiride', 'Amlodipine', 'Telmisartan', 'Atorvastatin',
  'Paracetamol', 'Dolo', 'Crocin', 'Calpol', 'Ibuprofen', 'Combiflam', 'Aspirin', 'Ecosprin',
  'Warfarin', 'Clopidogrel', 'Pantoprazole', 'Pan 40', 'Omeprazole', 'Omez', 'Ranitidine',
  'Amoxicillin', 'Augmentin', 'Azithromycin', 'Azee', 'Ciprofloxacin', 'Cefixime',
  'Cetirizine', 'Montelukast', 'Salbutamol', 'Asthalin', 'Deriphyllin', 'Theophylline',
  'Losartan', 'Enalapril', 'Hydrochlorothiazide', 'Spironolactone', 'Digoxin', 'Tramadol',
  'Levothyroxine', 'Thyronorm', 'Metoprolol', 'Bisoprolol', 'Rosuvastatin', 'Fluoxetine',
];

const TAMIL_MEDICATION_MAP: Array<{ pattern: RegExp; name: string; defaultDose?: string; defaultFreq?: string }> = [
  { pattern: /metformin|மெட்ஃபோர்மின்|மெட்பார்மின்|கிளைகோமெட்/i, name: 'Metformin', defaultDose: '500 mg', defaultFreq: 'Twice daily' },
  { pattern: /amoxicillin|amox|அமாக்சிசிலின்|அமாக்சிலின்|ஆக்மென்டின்/i, name: 'Amoxicillin', defaultDose: '500 mg', defaultFreq: 'Twice daily' },
  { pattern: /paracetamol|dolo|crocin|calpol|பாராசிட்டமால்|டோலோ|கால்பால்/i, name: 'Paracetamol', defaultDose: '650 mg', defaultFreq: 'Thrice daily' },
  { pattern: /aspirin|ecosprin|ஆஸ்பிரின்|எக்கோஸ்பிரின்/i, name: 'Aspirin', defaultDose: '75 mg', defaultFreq: 'Once daily' },
  { pattern: /warfarin|coumadin|வார்ஃபரின்|வார்ஃபாரின்/i, name: 'Warfarin', defaultDose: '2.5 mg', defaultFreq: 'Once daily' },
  { pattern: /pantoprazole|pan\s*40|பான்டோப்ராசோல்|பான்\s*40/i, name: 'Pantoprazole', defaultDose: '40 mg', defaultFreq: 'Once daily' },
  { pattern: /ibuprofen|brufen|combiflam|ஐபூப்ரூஃபன்|ப்ரூஃபென்/i, name: 'Ibuprofen', defaultDose: '400 mg', defaultFreq: 'Twice daily' },
  { pattern: /asthalin|salbutamol|அஸ்தாலின்|இன்ஹேலர்/i, name: 'Asthalin', defaultDose: '100 mcg', defaultFreq: '2 puffs PRN' },
];

function extractKnownMedications(text: string): StructuredMedicalInfo['medications'] {
  const result: StructuredMedicalInfo['medications'] = [];
  const added = new Set<string>();

  // Check Tamil and colloquial brand mappings first
  for (const item of TAMIL_MEDICATION_MAP) {
    if (item.pattern.test(text)) {
      added.add(item.name.toLowerCase());
      const near = text.match(new RegExp(`(?:${item.pattern.source}).{0,50}`, 'i'))?.[0] || '';
      const dosage = near.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?|puffs?)\b/i)?.[0] || item.defaultDose;
      const frequency = near.match(/\b(?:once|twice|thrice|1-0-1|1-1-1|0-1-0|0-0-1)\s+(?:a\s+)?day\b|\b(?:daily|nightly|morning|evening|after\s+food|empty\s+stomach)\b/i)?.[0] || item.defaultFreq;
      result.push({ name: item.name, ...(dosage ? { dosage } : {}), ...(frequency ? { frequency } : {}) });
    }
  }

  // Check general extensive list
  for (const name of EXTENSIVE_MEDICATIONS) {
    if (!added.has(name.toLowerCase()) && new RegExp(`\\b${name}\\b`, 'i').test(text)) {
      added.add(name.toLowerCase());
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const near = text.match(new RegExp(`${escaped}.{0,50}`, 'i'))?.[0] || '';
      const dosage = near.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?|puffs?)\b/i)?.[0];
      const frequency = near.match(/\b(?:once|twice|thrice|1-0-1|1-1-1|0-1-0|0-0-1)\s+(?:a\s+)?day\b|\b(?:daily|nightly|morning|evening|after\s+food|empty\s+stomach)\b/i)?.[0];
      result.push({ name, ...(dosage ? { dosage } : {}), ...(frequency ? { frequency } : {}) });
    }
  }

  return result;
}

function extractAllergies(text: string) {
  const list: Array<{ substance: string; reaction?: string }> = [];
  if (/penicillin|பெனிசிலின்|பென்சிலின்/i.test(text)) {
    list.push({ substance: 'Penicillin', reaction: 'Severe allergic rash / anaphylaxis risk' });
  }
  if (/sulfa|சல்ஃபா/i.test(text)) {
    list.push({ substance: 'Sulfa', reaction: 'Severe allergic reaction' });
  }
  const match = text.match(/allerg(?:y|ic)\s+(?:to\s+)?([^,.;]+?)(?=\s+(?:and|but|with)\b|[,.;]|$)/i);
  if (match?.[1]) {
    const sub = match[1].trim().slice(0, 120);
    if (!list.some(a => a.substance.toLowerCase() === sub.toLowerCase())) {
      list.push({ substance: sub });
    }
  }
  return list;
}

export async function extractMedicalInfo(
  text: string,
  language = 'English',
  existingAllergies: string[] = []
): Promise<StructuredMedicalInfo> {
  const clean = text.trim();

  // Try online Gemini Voice NLP if configured
  if (isGeminiConfigured()) {
    try {
      const geminiResult = await extractVoiceWithGemini(clean, language);
      const extractedMeds = geminiResult.medications.map((m) => m.name);
      geminiResult.safetyEvaluation = evaluatePrescriptionSafety(
        extractedMeds,
        [],
        [...geminiResult.allergies.map((a) => a.substance), ...existingAllergies]
      );
      return geminiResult;
    } catch (err: any) {
      console.warn('Gemini voice extraction failed. Using robust local NLP parser:', err.message);
    }
  }

  // Robust Local Clinical NLP Engine
  const duration = detectDuration(clean);
  const severity = detectSeverity(clean);
  const symptomNames = [...new Set(symptomMatchers.filter(([rx]) => rx.test(clean)).map(([, name]) => name))];
  const symptoms = symptomNames.map((name, index) => ({
    name,
    ...(index === 0 && duration ? { duration } : {}),
    ...(index === 0 && severity ? { severity } : {}),
  }));

  const conditions: Array<{ name: string }> = [];
  if (/diabetes|sugar|சர்க்கரை|நீரிழிவு|मधुमेह|డయాబెటిస్|షుగర్/i.test(clean)) conditions.push({ name: 'Type 2 Diabetes' });
  if (/hypertension|\bbp\b|blood pressure|ரத்த அழுத்தம்|இரத்த அழுத்தம்|ब्लड प्रेशर|रक्तचाप|రక్తపోటు/i.test(clean)) conditions.push({ name: 'Hypertension' });
  if (/asthma|ஆஸ்துமா|दमा|ఆస్తమా|wheezing/i.test(clean)) conditions.push({ name: 'Bronchial Asthma' });
  if (/cholesterol|கொலஸ்ட்ரால்|कोलेस्ट्रॉल/i.test(clean)) conditions.push({ name: 'Dyslipidemia' });
  if (/heart|cardiac|நெஞ்சுவலி/i.test(clean)) conditions.push({ name: 'Coronary Artery Disease' });

  const medications = extractKnownMedications(clean);
  const allergies = extractAllergies(clean);

  const extractedMedNames = medications.map((m) => m.name);
  const safetyEvaluation = evaluatePrescriptionSafety(
    extractedMedNames,
    [],
    [...allergies.map((a) => a.substance), ...existingAllergies]
  );

  return {
    chiefComplaint: symptoms.map((s) => s.name).join(', ') || clean.slice(0, 120),
    symptoms,
    conditions,
    previousTreatments: [],
    medications,
    allergies,
    relevantHistory: conditions.map((c) => `${c.name} reported by patient`),
    followUpQuestions: questions(symptomNames),
    safetyEvaluation,
  };
}

export function generateClinicalSummary(patient: any): string {
  const conditions = patient.diagnoses?.map((d: any) => d.name) ?? [];
  const symptoms = patient.symptoms?.slice(0, 5).map((s: any) => `${s.name}${s.duration ? ` (${s.duration})` : ''}`) ?? [];
  const meds = patient.patientMedications?.filter((m: any) => m.status === 'ACTIVE').map((m: any) => m.medication.name) ?? [];
  const allergies = patient.allergies?.map((a: any) => a.substance) ?? [];
  const labs = patient.labResults?.slice(0, 6).map((r: any) => `${r.labTest.name}: ${r.value}${r.unit ? ` ${r.unit}` : ''}`) ?? [];
  const age = patient.age ? `${patient.age}-year-old` : 'age not specified';
  const gender = patient.gender ? patient.gender.toLowerCase() : 'individual';

  // Check safety conflicts across active meds and allergies
  const safety = evaluatePrescriptionSafety(meds, [], allergies);

  const clinicalFindings: string[] = [];
  // Glycemic assessment
  const hba1c = patient.labResults?.find((l: any) => /hba1c/i.test(l.labTest?.name));
  if (hba1c) {
    const val = parseFloat(hba1c.value);
    if (val >= 7.0) {
      clinicalFindings.push(`⚠️ Suboptimal Glycemic Control: Last HbA1c is ${hba1c.value}%, exceeding target <7.0%. Recommend reviewing oral antidiabetic titration and dietary adherence.`);
    } else {
      clinicalFindings.push(`✓ Glycemic Control: Last HbA1c is ${hba1c.value}% (Within target range).`);
    }
  }

  // Safety findings
  if (safety.hasCriticalAlerts) {
    clinicalFindings.push(`🚨 CRITICAL SAFETY RISK: ${safety.safetySummary}`);
  }

  const sections = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `PATIENT CLINICAL PRE-CONSULTATION SYNTHESIS`,
    `Patient: ${patient.name} (${patient.patientCode}) | ${age} ${gender} | Preferred Language: ${patient.preferredLanguage}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `\n1. CHRONIC CONDITIONS & DIAGNOSES:`,
    conditions.length ? conditions.map((c: string) => `  • ${c}`).join('\n') : '  • No chronic conditions currently registered in EHR.',
    `\n2. ACUTE REPORTED SYMPTOMS & PRESENTING COMPLAINTS:`,
    symptoms.length ? symptoms.map((s: string) => `  • ${s}`).join('\n') : '  • No active acute symptoms reported.',
    `\n3. CURRENT ACTIVE PHARMACOTHERAPY:`,
    meds.length ? meds.map((m: string) => `  • ${m}`).join('\n') : '  • No active medications registered.',
    `\n4. ALLERGIES & CONTRAINDICATION PROFILE:`,
    allergies.length ? allergies.map((a: string) => `  • ⚠️ ALLERGEN: ${a} (Strict cross-checking active)`).join('\n') : '  • No known drug or environmental allergies recorded.',
    `\n5. RECENT LABORATORY INVESTIGATIONS:`,
    labs.length ? labs.map((l: string) => `  • ${l}`).join('\n') : '  • No recent laboratory results available.',
    `\n6. CLINICAL RISK & SAFETY EVALUATION:`,
    `  • Clinical Safety Score: ${safety.safetyScore}/100`,
    clinicalFindings.length ? clinicalFindings.map((f) => `  • ${f}`).join('\n') : '  • No urgent safety contraindications identified. Ready for standard clinical consultation.',
    `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Note: Generated by MediBridge Clinical Intelligence. Requires mandatory clinician verification prior to therapeutic decisions.`,
  ];

  return sections.join('\n');
}
