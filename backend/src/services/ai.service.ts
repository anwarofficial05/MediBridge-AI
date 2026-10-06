export type StructuredMedicalInfo = {
  chiefComplaint: string;
  symptoms: Array<{ name: string; duration?: string; severity?: string }>;
  conditions: Array<{ name: string }>;
  previousTreatments: string[];
  medications: Array<{ name: string; dosage?: string; frequency?: string; duration?: string }>;
  allergies: Array<{ substance: string; reaction?: string }>;
  relevantHistory: string[];
  followUpQuestions: string[];
};

const symptomMatchers: Array<[RegExp, string]> = [
  [/fever|காய்ச்சல்|bukhar|बुखार|జ్వరం/i, 'Fever'],
  [/breath|breathing|moochu|மூச்சு|saans|सांस|శ్వాస/i, 'Breathing difficulty'],
  [/chest\s*pain|nenju|மார்பு|सीने.*दर्द|ఛాతీ.*నొప్పి/i, 'Chest pain'],
  [/cough|irumal|இருமல்|खांसी|దగ్గు/i, 'Cough'],
  [/dizz|mayakkam|மயக்கம்|चक्कर|తలతిరగ/i, 'Dizziness'],
  [/headache|thalai vali|தலைவலி|सिरदर्द|తలనొప్పి/i, 'Headache'],
  [/vomit|வாந்தி|उल्टी|వాంత/i, 'Vomiting'],
  [/stomach|vayiru|வயிறு|पेट.*दर्द|కడుపు/i, 'Abdominal pain'],
  [/sore\s*throat|throat\s*pain|தொண்டை.*வலி|गले.*दर्द|గొంతు.*నొప్పి/i, 'Sore throat'],
  [/body\s*pain|udal\s*vali|உடல்.*வலி|शरीर.*दर्द|ఒళ్ళు.*నొప్ప/i, 'Body pain'],
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
  if (!match) return undefined;
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
    q.add('What was the highest measured temperature, if known?');
    q.add('Are cough, chills, rash, or body pain also present?');
  }
  if (symptoms.includes('Breathing difficulty')) {
    q.add('When did the breathing difficulty start?');
    q.add('Is it present at rest or only with activity?');
    q.add('Are chest pain, dizziness, or fainting also present?');
  }
  if (symptoms.includes('Chest pain')) {
    q.add('When did the pain start?');
    q.add('Is it continuous or intermittent?');
    q.add('Is breathing difficulty also present?');
    q.add('Is dizziness or fainting also present?');
  }
  if (q.size === 0) {
    q.add('When did these symptoms start?');
    q.add('Have the symptoms become better, worse, or stayed the same?');
    q.add('Are there any other symptoms you want the clinician to know about?');
  }
  return [...q].slice(0, 5);
}

function extractKnownMedications(text: string): StructuredMedicalInfo['medications'] {
  const known = ['Metformin', 'Insulin', 'Amlodipine', 'Paracetamol', 'Atorvastatin'];
  return known.filter((name) => new RegExp(`\\b${name}\\b`, 'i').test(text)).map((name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const near = text.match(new RegExp(`${escaped}.{0,45}`, 'i'))?.[0] || '';
    const dosage = near.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?)\b/i)?.[0];
    const frequency = near.match(/\b(?:once|twice|thrice)\s+(?:a\s+)?day\b|\b(?:daily|nightly|morning|evening)\b/i)?.[0];
    return { name, ...(dosage ? { dosage } : {}), ...(frequency ? { frequency } : {}) };
  });
}

function extractAllergies(text: string) {
  const match = text.match(/allerg(?:y|ic)\s+(?:to\s+)?([^,.;]+?)(?=\s+(?:and|but|with)\b|[,.;]|$)/i);
  if (!match?.[1]) return [];
  return [{ substance: match[1].trim().slice(0, 120) }];
}

export async function extractMedicalInfo(text: string, _language = 'English'): Promise<StructuredMedicalInfo> {
  const clean = text.trim();
  const duration = detectDuration(clean);
  const severity = detectSeverity(clean);
  const symptomNames = [...new Set(symptomMatchers.filter(([rx]) => rx.test(clean)).map(([, name]) => name))];
  const symptoms = symptomNames.map((name, index) => ({
    name,
    ...(index === 0 && duration ? { duration } : {}),
    ...(index === 0 && severity ? { severity } : {}),
  }));

  const conditions: Array<{ name: string }> = [];
  if (/diabetes|sugar|சர்க்கரை|நீரிழிவு|मधुमेह|డయాబెటిస్|షుగర్/i.test(clean)) conditions.push({ name: 'Diabetes' });
  if (/hypertension|\bbp\b|blood pressure|ரத்த அழுத்தம்|இரத்த அழுத்தம்|ब्लड प्रेशर|रक्तचाप|రక్తపోటు/i.test(clean)) conditions.push({ name: 'Hypertension' });
  if (/asthma|ஆஸ்துமா|दमा|ఆస్తమా/i.test(clean)) conditions.push({ name: 'Asthma' });

  const medications = extractKnownMedications(clean);
  const allergies = extractAllergies(clean);

  return {
    chiefComplaint: symptoms.map((s) => s.name).join(', ') || clean.slice(0, 120),
    symptoms,
    conditions,
    previousTreatments: [],
    medications,
    allergies,
    relevantHistory: conditions.map((c) => `${c.name} reported by patient`),
    followUpQuestions: questions(symptomNames),
  };
}

export function generateClinicalSummary(patient: any) {
  const conditions = patient.diagnoses?.map((d: any) => d.name) ?? [];
  const symptoms = patient.symptoms?.slice(0, 5).map((s: any) => `${s.name}${s.duration ? ` (${s.duration})` : ''}`) ?? [];
  const meds = patient.patientMedications?.filter((m: any) => m.status === 'ACTIVE').map((m: any) => m.medication.name) ?? [];
  const allergies = patient.allergies?.map((a: any) => a.substance) ?? [];
  const labs = patient.labResults?.slice(0, 4).map((r: any) => `${r.labTest.name}: ${r.value}${r.unit ? ` ${r.unit}` : ''}`) ?? [];
  const age = patient.age ? `${patient.age}-year-old` : 'age not recorded';
  return [
    `Patient: ${patient.name}, ${age}${patient.gender ? ` ${patient.gender.toLowerCase()}` : ''}.`,
    `Known Conditions: ${conditions.length ? [...new Set(conditions)].join(', ') : 'No conditions recorded'}.`,
    `Current/Recent Reported Symptoms: ${symptoms.length ? symptoms.join(', ') : 'No recent symptoms recorded'}.`,
    `Current Medications: ${meds.length ? [...new Set(meds)].join(', ') : 'No active medications recorded'}.`,
    `Recent Reports: ${labs.length ? labs.join('; ') : 'No recent lab results recorded'}.`,
    `Allergies: ${allergies.length ? allergies.join(', ') : 'No known allergies recorded'}.`,
  ].join('\n\n');
}
