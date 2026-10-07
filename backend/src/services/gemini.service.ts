import fs from 'node:fs';
import { env } from '../utils/env.js';
import type { MockDocumentExtraction } from './document.service.js';
import type { StructuredMedicalInfo } from './ai.service.js';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export function isGeminiConfigured(): boolean {
  return Boolean(env.AI_API_KEY && env.AI_API_KEY.trim() && env.AI_API_KEY !== 'replace-with-your-key');
}

/**
 * Extracts structured medical data from an image/PDF file using Gemini Multimodal Vision API.
 */
export async function extractDocumentWithGemini(
  filePath: string,
  mimeType: string,
  originalName: string
): Promise<MockDocumentExtraction> {
  const apiKey = env.AI_API_KEY.trim();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured');
  }

  const fileBuffer = await fs.promises.readFile(filePath);
  const base64Data = fileBuffer.toString('base64');

  const prompt = `You are a clinical AI medical document reader and prescription intelligence system.
Analyze this medical document or prescription image/PDF thoroughly.
Extract the exact information into a valid JSON object matching this schema precisely:
{
  "patientName": "string or empty if not present",
  "doctorName": "string or empty if not present",
  "hospital": "string or empty if not present",
  "date": "YYYY-MM-DD or empty",
  "diagnosisRecorded": ["string list of recorded diagnoses/conditions"],
  "medicines": [
    {
      "name": "brand or generic medication name",
      "dosage": "e.g., 500 mg, 10 ml",
      "frequency": "e.g., Twice daily, 1-0-1, OD, BD, TDS",
      "duration": "e.g., 5 days, 1 month"
    }
  ],
  "labTests": [
    {
      "name": "lab test name e.g., HbA1c, Fasting Blood Sugar, Creatinine",
      "value": "numeric or string result",
      "unit": "e.g., %, mg/dL",
      "referenceRange": "reference interval if printed"
    }
  ],
  "allergies": [
    {
      "substance": "allergen name e.g., Penicillin",
      "reaction": "reaction description if recorded"
    }
  ],
  "followUpDate": "YYYY-MM-DD or empty",
  "note": "A concise clinical summary of the document findings and any handwritten warnings observed."
}

Rules:
1. Pay careful attention to handwritten medication names, dosages, and frequency notations (like 1-0-1, BD, OD).
2. If doctor handwriting is ambiguous, provide the most clinically probable medication name.
3. Return ONLY valid JSON, with no markdown backticks, no code fence, and no extra commentary.`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType === 'application/pdf' ? 'application/pdf' : mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Vision API error (${response.status}): ${errorText}`);
  }

  const result: any = await response.json();
  const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error('Gemini returned an empty response');
  }

  const parsed = JSON.parse(textContent);
  return {
    patientName: parsed.patientName || 'Patient',
    doctorName: parsed.doctorName || '',
    hospital: parsed.hospital || '',
    date: parsed.date || new Date().toISOString().split('T')[0],
    diagnosisRecorded: Array.isArray(parsed.diagnosisRecorded) ? parsed.diagnosisRecorded : [],
    medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
    labTests: Array.isArray(parsed.labTests) ? parsed.labTests : [],
    allergies: Array.isArray(parsed.allergies) ? parsed.allergies : [],
    followUpDate: parsed.followUpDate || '',
    note: parsed.note || `Extracted using Google Gemini Vision AI from ${originalName}.`,
  };
}

/**
 * Extracts structured clinical information from multilingual voice/text transcript using Gemini.
 */
export async function extractVoiceWithGemini(
  transcript: string,
  language: string
): Promise<StructuredMedicalInfo> {
  const apiKey = env.AI_API_KEY.trim();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured');
  }

  const prompt = `You are a clinical multilingual medical assistant specializing in Indian healthcare conversations.
The following transcript is from a patient describing their symptoms, medical history, or current medications.
Language used: ${language} (may include colloquial or transliterated Tamil, Hindi, Telugu, or Indian English).

Patient transcript:
"${transcript}"

Extract the clinical information into a strictly valid JSON object matching this schema:
{
  "chiefComplaint": "Primary symptom or reason for consultation in concise clinical terms",
  "symptoms": [
    {
      "name": "Standardized clinical symptom name (e.g., Fever, Dyspnea, Productive cough)",
      "duration": "e.g., 3 days, 2 weeks",
      "severity": "Mild, Moderate, or Severe"
    }
  ],
  "conditions": [
    { "name": "Chronic or pre-existing condition mentioned (e.g., Type 2 Diabetes, Hypertension, Asthma)" }
  ],
  "previousTreatments": ["treatments or remedies attempted"],
  "medications": [
    {
      "name": "Medication name mentioned by patient",
      "dosage": "dosage if mentioned",
      "frequency": "frequency if mentioned",
      "duration": "duration if mentioned"
    }
  ],
  "allergies": [
    {
      "substance": "allergen",
      "reaction": "reaction"
    }
  ],
  "relevantHistory": ["Key historical risk factors or details"],
  "followUpQuestions": [
    "3 to 5 clinically pertinent triage/follow-up questions a doctor would ask based specifically on these symptoms"
  ]
}

Return ONLY raw JSON, with no markdown code fences.`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Voice NLP API error (${response.status}): ${errorText}`);
  }

  const result: any = await response.json();
  const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error('Gemini returned an empty response');
  }

  const parsed = JSON.parse(textContent);
  return {
    chiefComplaint: parsed.chiefComplaint || transcript.slice(0, 100),
    symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
    conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
    previousTreatments: Array.isArray(parsed.previousTreatments) ? parsed.previousTreatments : [],
    medications: Array.isArray(parsed.medications) ? parsed.medications : [],
    allergies: Array.isArray(parsed.allergies) ? parsed.allergies : [],
    relevantHistory: Array.isArray(parsed.relevantHistory) ? parsed.relevantHistory : [],
    followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [],
  };
}
