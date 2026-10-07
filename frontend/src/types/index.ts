export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';
export type User = { id: string; name: string; email: string; role: UserRole };

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

export type SafetyEvaluation = {
  hasCriticalAlerts: boolean;
  interactionAlerts: DrugInteractionAlert[];
  allergyAlerts: AllergyConflictAlert[];
  safetyScore: number;
  safetySummary: string;
};

export type VoiceSession = {
  id: string;
  patientId: string;
  language: string;
  transcript: string;
  approved: boolean;
  approvedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
  extracted?: Extraction | null;
};

export type Patient = {
  id: string;
  patientCode: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  preferredLanguage: string;
  allergies?: any[];
  symptoms?: any[];
  diagnoses?: any[];
  patientMedications?: any[];
  labResults?: any[];
  consultations?: any[];
  medicalDocuments?: any[];
  clinicalSummaries?: any[];
  voiceSessions?: VoiceSession[];
};

export type Extraction = {
  chiefComplaint: string;
  symptoms: Array<{ name: string; duration?: string; severity?: string }>;
  conditions: Array<{ name: string }>;
  previousTreatments: string[];
  medications: Array<{ name: string; dosage?: string; frequency?: string; duration?: string }>;
  allergies: Array<{ substance: string; reaction?: string }>;
  relevantHistory: string[];
  followUpQuestions: string[];
  disclaimer?: string;
  safetyEvaluation?: SafetyEvaluation;
};
