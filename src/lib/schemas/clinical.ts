// ============================================================
// CLINICAL SCHEMAS - Zod Validation Schemas for Clinical Data
// ============================================================

import { z } from 'zod';

// ------------------------------------------------------------
// PATIENT SCHEMAS
// ------------------------------------------------------------

export const PatientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  birthDate: z.coerce.date(),
  sex: z.enum(['M', 'F', 'OTHER']).optional(),
  genderIdentity: z.string().optional(),
  race: z.string().optional(),
  ethnicity: z.string().optional(),
  phone: z.string().optional(),
  addressZipCode: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  organDonor: z.boolean().default(false),
});

export type PatientInput = z.infer<typeof PatientSchema>;

// ------------------------------------------------------------
// SYMPTOM SCHEMAS
// ------------------------------------------------------------

export const SeveritySchema = z.enum(['mild', 'moderate', 'severe', 'very_severe']);
export const ProgressionSchema = z.enum(['improving', 'worsening', 'stable', 'fluctuating']);
export const TemporalPatternSchema = z.enum(['constant', 'intermittent', 'episodic', 'progressive']);

export const SymptomReportSchema = z.object({
  symptomName: z.string().min(1, 'Nome do sintoma é obrigatório'),
  bodySite: z.string().optional(),
  onsetDate: z.coerce.date().optional(),
  onsetDuration: z.string().optional(),
  severity: z.number().min(1).max(10).optional(),
  severityDescription: SeveritySchema.optional(),
  character: z.string().optional(), // sharp, dull, burning, aching, etc.
  radiation: z.string().optional(),
  aggravatingFactors: z.array(z.string()).optional(),
  relievingFactors: z.array(z.string()).optional(),
  associatedSymptoms: z.array(z.string()).optional(),
  progression: ProgressionSchema.optional(),
  impactOnDailyLife: z.string().optional(),
  temporalPattern: TemporalPatternSchema.optional(),
  context: z.string().optional(),
});

export type SymptomReportInput = z.infer<typeof SymptomReportSchema>;

// ------------------------------------------------------------
// CHAT MESSAGE SCHEMAS
// ------------------------------------------------------------

export const MessageRoleSchema = z.enum(['USER', 'ASSISTANT', 'SYSTEM']);

export const ChatMessageSchema = z.object({
  id: z.string().optional(),
  sessionId: z.string(),
  role: MessageRoleSchema,
  content: z.string().min(1),
  contentType: z.string().default('text'),
  metadata: z.record(z.unknown()).optional(),
  sentiment: z.string().optional(),
  intent: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type ChatMessageInput = z.infer<typeof ChatMessageSchema>;

// ------------------------------------------------------------
// TRIAGE SCHEMAS
// ------------------------------------------------------------

export const PrioritySchema = z.enum(['IMMEDIATE', 'URGENT', 'HIGH', 'MODERATE', 'ROUTINE', 'LOW']);

export const RedFlagSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
  severity: z.enum(['critical', 'high', 'moderate']),
  ruleTriggered: z.string().optional(),
  dataPoints: z.array(z.string()).optional(),
  recommendation: z.string().optional(),
});

export const TriageAssessmentSchema = z.object({
  patientId: z.string(),
  sessionId: z.string(),
  priority: PrioritySchema,
  priorityRationale: z.string().optional(),
  urgencyScore: z.number().min(0).max(100).optional(),
  urgencyLevel: z.string().optional(),
  redFlags: z.array(RedFlagSchema).default([]),
  riskFactors: z.array(z.string()).default([]),
  protectiveFactors: z.array(z.string()).default([]),
  dataCompleteness: z.number().min(0).max(100).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  limitations: z.array(z.string()).default([]),
  recommendedAction: z.string().optional(),
  estimatedUrgency: z.string().optional(),
  clinicalReasoning: z.string().optional(),
  modelVersion: z.string().optional(),
});

export type TriageAssessmentInput = z.infer<typeof TriageAssessmentSchema>;
export type RedFlag = z.infer<typeof RedFlagSchema>;

// ------------------------------------------------------------
// CLINICAL SUMMARY SCHEMAS
// ------------------------------------------------------------

export const DifferentialHypothesisSchema = z.object({
  hypothesisName: z.string(),
  icdCode: z.string().optional(),
  probability: z.number().min(0).max(1).optional(),
  confidenceLevel: z.enum(['high', 'medium', 'low']).optional(),
  supportingEvidence: z.array(z.string()).default([]),
  contradictingEvidence: z.array(z.string()).default([]),
  missingData: z.array(z.string()).default([]),
  suggestedWorkup: z.array(z.string()).default([]),
  urgency: z.string().optional(),
  notes: z.string().optional(),
  rankOrder: z.number().optional(),
});

export const ClinicalSummarySchema = z.object({
  sessionId: z.string(),
  patientId: z.string(),
  chiefComplaint: z.string(),
  historyPresentIllness: z.string(),
  relevantHistory: z.string().optional(),
  currentMedications: z.array(z.string()).default([]),
  allergiesSummary: z.string().optional(),
  vitalSignsSummary: z.string().optional(),
  relevantLabResults: z.array(z.string()).default([]),
  riskFactorsSummary: z.string().optional(),
  dataGaps: z.array(z.string()).default([]),
  inconsistencies: z.array(z.string()).default([]),
  pendingExams: z.array(z.string()).default([]),
  alertFlags: z.array(z.string()).default([]),
  triagePriority: PrioritySchema,
  clinicalNotes: z.string().optional(),
  summaryForPhysician: z.string().optional(),
  hypotheses: z.array(DifferentialHypothesisSchema).default([]),
});

export type ClinicalSummaryInput = z.infer<typeof ClinicalSummarySchema>;
export type DifferentialHypothesisInput = z.infer<typeof DifferentialHypothesisSchema>;

// ------------------------------------------------------------
// PRE-CONSULTATION SESSION SCHEMAS
// ------------------------------------------------------------

export const SessionStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ESCALATED']);

export const PreConsultationSessionSchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  encounterId: z.string().optional(),
  userId: z.string(),
  status: SessionStatusSchema.default('ACTIVE'),
  primaryComplaint: z.string().optional(),
});

export type PreConsultationSessionInput = z.infer<typeof PreConsultationSessionSchema>;

// ------------------------------------------------------------
// AGENT OUTPUT SCHEMAS
// ------------------------------------------------------------

export const AgentInterviewOutputSchema = z.object({
  sessionComplete: z.boolean(),
  questionsAsked: z.array(z.string()),
  symptomsExtracted: z.array(SymptomReportSchema),
  dataGaps: z.array(z.string()),
  recommendedFollowUp: z.array(z.string()).optional(),
  nextQuestion: z.string().optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

export type AgentInterviewOutput = z.infer<typeof AgentInterviewOutputSchema>;

export const AgentTriageOutputSchema = z.object({
  priority: PrioritySchema,
  urgencyScore: z.number().min(0).max(100),
  redFlags: z.array(RedFlagSchema),
  riskFactors: z.array(z.string()),
  protectiveFactors: z.array(z.string()),
  dataCompleteness: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(1),
  limitations: z.array(z.string()),
  recommendedAction: z.string(),
  clinicalReasoning: z.string(),
  escalationRequired: z.boolean(),
});

export type AgentTriageOutput = z.infer<typeof AgentTriageOutputSchema>;

export const AgentSummaryOutputSchema = z.object({
  chiefComplaint: z.string(),
  historyPresentIllness: z.string(),
  relevantHistory: z.string(),
  currentMedications: z.array(z.string()),
  allergiesSummary: z.string(),
  riskFactorsSummary: z.string(),
  dataGaps: z.array(z.string()),
  pendingExams: z.array(z.string()),
  alertFlags: z.array(z.string()),
  summaryForPhysician: z.string(),
  keyPoints: z.array(z.string()),
});

export type AgentSummaryOutput = z.infer<typeof AgentSummaryOutputSchema>;

export const AgentHypothesisOutputSchema = z.object({
  hypotheses: z.array(DifferentialHypothesisSchema),
  primaryHypothesis: z.string(),
  diagnosticApproach: z.string(),
  dataNeeded: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  limitations: z.string(),
});

export type AgentHypothesisOutput = z.infer<typeof AgentHypothesisOutputSchema>;
