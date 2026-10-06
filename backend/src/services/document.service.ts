export type MockDocumentExtraction = {
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
};

export async function extractDocumentData(fileName: string): Promise<MockDocumentExtraction> {
  const labLike = /lab|hba1c|report/i.test(fileName);
  return {
    patientName: 'Ravi Kumar',
    doctorName: 'Dr. Priya Raman',
    hospital: 'MediBridge Demo Hospital',
    date: '2026-08-05',
    diagnosisRecorded: ['Type 2 Diabetes'],
    medicines: labLike ? [] : [
      { name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily', duration: '30 days' },
      { name: 'Paracetamol', dosage: '500 mg', frequency: 'As recorded in prescription', duration: '3 days' },
    ],
    labTests: labLike ? [
      { name: 'HbA1c', value: '7.4', unit: '%', referenceRange: 'Lab-specific reference range' },
      { name: 'Fasting Blood Glucose', value: '132', unit: 'mg/dL', referenceRange: '70-99 mg/dL' },
    ] : [],
    allergies: [],
    followUpDate: '2026-09-15',
    note: 'Mock OCR/extraction output for demonstration. Must be verified against the original document by a clinician.',
  };
}
