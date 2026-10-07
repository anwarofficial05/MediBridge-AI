// Curated clinical prescriptions designed for high-impact judge demonstrations at Project Ignite

export interface SamplePrescription {
  id: 'penicillin-allergy' | 'warfarin-hazard' | 'clean-diabetic';
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  hospital: string;
  doctor: string;
  doctorReg: string;
  patientName: string;
  patientCode: string;
  patientDetails: string;
  date: string;
  rawText: string;
  extraction: {
    patientName: string;
    doctorName: string;
    hospital: string;
    date: string;
    diagnosisRecorded: string[];
    medicines: Array<{ name: string; dosage: string; frequency: string; duration: string }>;
    labTests: Array<{ name: string; value: string; unit: string; referenceRange?: string }>;
    allergies: Array<{ substance: string; reaction?: string }>;
    followUpDate: string;
    note: string;
    safetyEvaluation: {
      hasCriticalAlerts: boolean;
      interactionAlerts: Array<{
        drugA: string;
        drugB: string;
        severity: 'CRITICAL' | 'MODERATE' | 'INFO';
        mechanism: string;
        clinicalEffect: string;
        recommendation: string;
      }>;
      allergyAlerts: Array<{
        medication: string;
        allergen: string;
        severity: 'CRITICAL' | 'MODERATE';
        clinicalEffect: string;
        recommendation: string;
      }>;
      safetyScore: number;
      safetySummary: string;
    };
  };
}

const todayStr = new Date().toISOString().split('T')[0];

export const SAMPLE_PRESCRIPTIONS: SamplePrescription[] = [
  {
    id: 'penicillin-allergy',
    badge: '🚨 CRITICAL ALLERGY ALERT',
    badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-300',
    title: 'Case 1: Penicillin Allergy Interception (Amoxicillin)',
    subtitle:
      'Doctor prescribes Amoxicillin for pharyngitis. Intercepted in real time against patient Ravi Kumar’s documented Penicillin allergy in EHR!',
    hospital: 'Apollo Multispecialty Hospitals, Greams Road, Chennai',
    doctor: 'Dr. Priya Raman, MBBS, MD (General Medicine)',
    doctorReg: 'MCI-TN-84210',
    patientName: 'Ravi Kumar',
    patientCode: 'MB-P-1001',
    patientDetails: '52 Yrs / Male • Known Penicillin Allergy (EHR Verified)',
    date: todayStr,
    rawText: `APOLLO MULTISPECIALTY HOSPITALS
Greams Road, Chennai - 600006
OUTPATIENT CONSULTATION PRESCRIPTION

Doctor: Dr. Priya Raman, MBBS, MD (General Medicine)  Reg No: MCI-TN-84210
Patient: Ravi Kumar | Age/Gender: 52 / Male | ID: MB-P-1001
Date: ${todayStr}

Diagnosis: Acute Streptococcal Pharyngitis, Pyrexia

Rx:
1. Tab. Amoxicillin + Clavulanate (Augmentin) 625mg
   Dose: 1 tablet - Frequency: Twice daily (after food) - Duration: 5 days
2. Tab. Paracetamol (Dolo 650) 650mg
   Dose: 1 tablet - Frequency: Thrice daily if fever >100°F - Duration: 3 days
3. Cap. Pantoprazole 40mg
   Dose: 1 capsule - Frequency: Once daily (empty stomach, morning) - Duration: 5 days

Special Advice: Drink warm fluids. Complete full antibiotic course.
Doctor Signature: Dr. Priya Raman (Verified Digital Signature)`,
    extraction: {
      patientName: 'Ravi Kumar',
      doctorName: 'Dr. Priya Raman, MBBS, MD',
      hospital: 'Apollo Multispecialty Hospitals, Chennai',
      date: todayStr,
      diagnosisRecorded: ['Acute Streptococcal Pharyngitis', 'Pyrexia'],
      medicines: [
        {
          name: 'Amoxicillin + Clavulanate (Augmentin)',
          dosage: '625 mg',
          frequency: 'Twice daily (after food)',
          duration: '5 days',
        },
        {
          name: 'Paracetamol (Dolo 650)',
          dosage: '650 mg',
          frequency: 'Thrice daily if fever >100°F',
          duration: '3 days',
        },
        {
          name: 'Pantoprazole',
          dosage: '40 mg',
          frequency: 'Once daily (empty stomach, morning)',
          duration: '5 days',
        },
      ],
      labTests: [
        { name: 'Fasting Blood Sugar', value: '138', unit: 'mg/dL', referenceRange: '70-99 mg/dL' },
        { name: 'C-Reactive Protein (CRP)', value: '18.4', unit: 'mg/L', referenceRange: '<5 mg/L' },
      ],
      allergies: [
        { substance: 'Penicillin', reaction: 'Severe anaphylactic urticaria & bronchospasm' },
      ],
      followUpDate: '2026-10-15',
      note: 'Prescription scanned via Optical Vision AI. CRITICAL CONTRAINDICATION: Patient EHR records severe Penicillin allergy. Amoxicillin cross-reacts with Penicillin beta-lactam core.',
      safetyEvaluation: {
        hasCriticalAlerts: true,
        interactionAlerts: [],
        allergyAlerts: [
          {
            medication: 'Amoxicillin + Clavulanate (Augmentin)',
            allergen: 'Penicillin',
            severity: 'CRITICAL',
            clinicalEffect: 'Severe Anaphylactic Shock, Angioedema, Bronchospasm, Acute Urticaria.',
            recommendation:
              'Absolute contraindication! Patient Ravi Kumar has documented Penicillin allergy in EHR. Cancel Amoxicillin immediately and switch to Macrolides (e.g. Azithromycin 500mg) or Fluoroquinolones.',
          },
        ],
        safetyScore: 25,
        safetySummary:
          'CRITICAL ALLERGEN INTERCEPTION: Patient Ravi Kumar has recorded Penicillin allergy. Prescribed Amoxicillin contains a cross-reactive beta-lactam nucleus. Fatal anaphylaxis hazard!',
      },
    },
  },
  {
    id: 'warfarin-hazard',
    badge: '⚡ FATAL BLEEDING HAZARD',
    badgeColor: 'bg-amber-500/10 text-amber-700 border-amber-300',
    title: 'Case 2: Lethal Drug-Drug Interaction (Warfarin + Aspirin + Ibuprofen)',
    subtitle:
      'Cardiology prescription adding Aspirin and Ibuprofen to a patient on Warfarin therapy -> Triggers systemic internal hemorrhage alert!',
    hospital: 'Madras Heart Institute, Department of Cardiology, Chennai',
    doctor: 'Dr. Arvind Swaminathan, MD, DM (Cardiology)',
    doctorReg: 'MCI-TN-72195',
    patientName: 'Ravi Kumar',
    patientCode: 'MB-P-1001',
    patientDetails: '52 Yrs / Male • On Long-term Anticoagulation Prophylaxis',
    date: todayStr,
    rawText: `MADRAS HEART INSTITUTE
Department of Cardiology & Vascular Medicine
OUTPATIENT PRESCRIPTION SLIP

Doctor: Dr. Arvind Swaminathan, MD, DM (Cardiology)  Reg No: MCI-TN-72195
Patient: Ravi Kumar | Age: 52 / M | Patient Code: MB-P-1001
Date: ${todayStr}

Diagnosis: Deep Vein Thrombosis Prophylaxis, Severe Knee Arthralgia

Rx:
1. Tab. Warfarin Sodium 2.5mg
   Dose: 1 tablet - Frequency: Once daily at 7 PM (strictly per INR) - Duration: 30 days
2. Tab. Ecosprin (Aspirin) 75mg
   Dose: 1 tablet - Frequency: Once daily after lunch - Duration: 30 days
3. Tab. Ibuprofen 400mg
   Dose: 1 tablet - Frequency: Twice daily after food for severe joint pain - Duration: 5 days

Special Advice: Monitor PT/INR every 14 days. Report any spontaneous bruising or bleeding.
Doctor Signature: Dr. Arvind Swaminathan`,
    extraction: {
      patientName: 'Ravi Kumar',
      doctorName: 'Dr. Arvind Swaminathan, MD, DM',
      hospital: 'Madras Heart Institute, Chennai',
      date: todayStr,
      diagnosisRecorded: ['Deep Vein Thrombosis Prophylaxis', 'Severe Knee Arthralgia'],
      medicines: [
        {
          name: 'Warfarin Sodium',
          dosage: '2.5 mg',
          frequency: 'Once daily (7 PM, per INR)',
          duration: '30 days',
        },
        {
          name: 'Ecosprin (Aspirin)',
          dosage: '75 mg',
          frequency: 'Once daily (after lunch)',
          duration: '30 days',
        },
        {
          name: 'Ibuprofen',
          dosage: '400 mg',
          frequency: 'Twice daily (after food)',
          duration: '5 days',
        },
      ],
      labTests: [
        { name: 'PT / INR', value: '2.4', unit: 'INR', referenceRange: '2.0 - 3.0 Therapeutic' },
      ],
      allergies: [],
      followUpDate: '2026-10-22',
      note: 'Multi-drug therapy analyzed. CRITICAL DRUG-DRUG INTERACTION: Warfarin combined with Aspirin and Ibuprofen impairs primary and secondary hemostasis.',
      safetyEvaluation: {
        hasCriticalAlerts: true,
        interactionAlerts: [
          {
            drugA: 'Warfarin Sodium',
            drugB: 'Ecosprin (Aspirin)',
            severity: 'CRITICAL',
            mechanism: 'Dual antiplatelet (COX-1 inhibition) and anticoagulant (Vitamin K antagonism) synergism.',
            clinicalEffect:
              'Massive gastrointestinal bleeding, intracranial hemorrhage, fatal hemorrhagic stroke.',
            recommendation:
              'Absolute contraindication for concurrent unmonitored use. Withhold Aspirin unless explicitly guided by clinical cardiology protocol with proton pump inhibitor prophylaxis.',
          },
          {
            drugA: 'Warfarin Sodium',
            drugB: 'Ibuprofen',
            severity: 'CRITICAL',
            mechanism: 'Ibuprofen displaces Warfarin from plasma protein binding and causes gastric mucosal erosions.',
            clinicalEffect:
              'Profound prolongation of bleeding time, acute upper GI hemorrhage.',
            recommendation:
              'Discontinue Ibuprofen immediately. Use Paracetamol for analgesia in patients on Warfarin.',
          },
        ],
        allergyAlerts: [],
        safetyScore: 15,
        safetySummary:
          'CRITICAL DRUG INTERACTION: Combining Warfarin with Aspirin & Ibuprofen creates severe risk of fatal internal hemorrhage! Immediate clinician interception required.',
      },
    },
  },
  {
    id: 'clean-diabetic',
    badge: '✅ 100% SAFE REGIMEN',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-300',
    title: 'Case 3: Clean Routine Chronic Prescription (Metformin + Pantoprazole)',
    subtitle:
      'Standard chronic diabetes prescription. Perfectly aligned with patient Ravi Kumar’s clinical history with zero adverse interactions.',
    hospital: 'MediBridge Primary Healthcare Clinic, Thanjavur',
    doctor: 'Dr. Priya Raman, MBBS, MD (Internal Medicine)',
    doctorReg: 'MCI-TN-84210',
    patientName: 'Ravi Kumar',
    patientCode: 'MB-P-1001',
    patientDetails: '52 Yrs / Male • Type 2 Diabetes Follow-up',
    date: todayStr,
    rawText: `MEDIBRIDGE PRIMARY HEALTHCARE CLINIC
Comprehensive Chronic Care Unit, Thanjavur
PRESCRIPTION & MEDICATION REFILL

Doctor: Dr. Priya Raman, MBBS, MD  Reg No: MCI-TN-84210
Patient: Ravi Kumar | Age: 52 / M | Patient Code: MB-P-1001
Date: ${todayStr}

Diagnosis: Type 2 Diabetes Mellitus, Mild Dyspepsia

Rx:
1. Tab. Metformin HCl 500mg
   Dose: 1 tablet - Frequency: Twice daily (with breakfast & dinner) - Duration: 30 days
2. Cap. Pantoprazole 40mg
   Dose: 1 capsule - Frequency: Once daily (empty stomach, 30 min before breakfast) - Duration: 14 days
3. Tab. Neurobion Forte (Vitamin B12)
   Dose: 1 tablet - Frequency: Once daily after lunch - Duration: 30 days

Special Advice: Maintain 30-minute brisk walk daily. Fasting plasma glucose check in 4 weeks.
Doctor Signature: Dr. Priya Raman`,
    extraction: {
      patientName: 'Ravi Kumar',
      doctorName: 'Dr. Priya Raman, MBBS, MD',
      hospital: 'MediBridge Primary Healthcare Clinic',
      date: todayStr,
      diagnosisRecorded: ['Type 2 Diabetes Mellitus', 'Mild Dyspepsia'],
      medicines: [
        {
          name: 'Metformin HCl',
          dosage: '500 mg',
          frequency: 'Twice daily (with meals)',
          duration: '30 days',
        },
        {
          name: 'Pantoprazole',
          dosage: '40 mg',
          frequency: 'Once daily (empty stomach, morning)',
          duration: '14 days',
        },
        {
          name: 'Neurobion Forte (Vitamin B12)',
          dosage: '1 tablet',
          frequency: 'Once daily (after lunch)',
          duration: '30 days',
        },
      ],
      labTests: [
        { name: 'HbA1c', value: '7.4', unit: '%', referenceRange: '<5.7% Normal' },
        { name: 'Fasting Blood Glucose', value: '132', unit: 'mg/dL', referenceRange: '70-99 mg/dL' },
      ],
      allergies: [],
      followUpDate: '2026-11-05',
      note: 'Routine chronic pharmacotherapy verified. All prescribed medications are within therapeutic indices and free of drug-drug interactions.',
      safetyEvaluation: {
        hasCriticalAlerts: false,
        interactionAlerts: [],
        allergyAlerts: [],
        safetyScore: 100,
        safetySummary:
          'Prescription passed all clinical interaction and allergy checks. 100/100 Safety Score. Verified safe for patient Ravi Kumar.',
      },
    },
  },
];
