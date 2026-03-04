/**
 * Testes de validação dos schemas Zod clínicos
 */
import { describe, it, expect } from 'vitest';
import {
  AgentTriageOutputSchema,
  AgentInterviewOutputSchema,
  PatientSchema,
  RedFlagSchema,
  PrioritySchema,
} from '../clinical';

// ── Helpers ──────────────────────────────────────────────────

const validTriage = {
  priority: 'ROUTINE' as const,
  urgencyScore: 20,
  redFlags: [],
  riskFactors: ['hipertensão'],
  protectiveFactors: [],
  dataCompleteness: 80,
  confidenceScore: 0.85,
  limitations: [],
  recommendedAction: 'Consulta de rotina',
  clinicalReasoning: 'Sem sinais de urgência identificados',
  escalationRequired: false,
};

// ── AgentTriageOutputSchema ───────────────────────────────────

describe('AgentTriageOutputSchema', () => {
  it('aceita output de triagem válido e completo', () => {
    expect(AgentTriageOutputSchema.safeParse(validTriage).success).toBe(true);
  });

  it('rejeita urgencyScore acima de 100', () => {
    expect(AgentTriageOutputSchema.safeParse({ ...validTriage, urgencyScore: 101 }).success).toBe(false);
  });

  it('rejeita urgencyScore negativo', () => {
    expect(AgentTriageOutputSchema.safeParse({ ...validTriage, urgencyScore: -1 }).success).toBe(false);
  });

  it('rejeita confidenceScore acima de 1', () => {
    expect(AgentTriageOutputSchema.safeParse({ ...validTriage, confidenceScore: 1.01 }).success).toBe(false);
  });

  it('rejeita confidenceScore negativo', () => {
    expect(AgentTriageOutputSchema.safeParse({ ...validTriage, confidenceScore: -0.1 }).success).toBe(false);
  });

  it('rejeita priority inválida', () => {
    expect(AgentTriageOutputSchema.safeParse({ ...validTriage, priority: 'SUPER_URGENT' }).success).toBe(false);
  });

  it('aplica default de array vazio para redFlags quando ausente', () => {
    const result = AgentTriageOutputSchema.safeParse({ ...validTriage, redFlags: undefined });
    expect(result.success).toBe(true);
    if (result.success) expect(Array.isArray(result.data.redFlags)).toBe(true);
  });

  it('aplica default de array vazio para riskFactors quando ausente', () => {
    const result = AgentTriageOutputSchema.safeParse({ ...validTriage, riskFactors: undefined });
    expect(result.success).toBe(true);
    if (result.success) expect(Array.isArray(result.data.riskFactors)).toBe(true);
  });

  it('aplica default de array vazio para limitations quando ausente', () => {
    const result = AgentTriageOutputSchema.safeParse({ ...validTriage, limitations: undefined });
    expect(result.success).toBe(true);
    if (result.success) expect(Array.isArray(result.data.limitations)).toBe(true);
  });

  it('rejeita quando recommendedAction está ausente', () => {
    const { recommendedAction: _, ...withoutAction } = validTriage;
    expect(AgentTriageOutputSchema.safeParse(withoutAction).success).toBe(false);
  });
});

// ── PatientSchema ─────────────────────────────────────────────

describe('PatientSchema', () => {
  const validPatient = {
    name: 'João da Silva',
    birthDate: new Date('1980-06-15'),
  };

  it('aceita paciente com campos mínimos obrigatórios', () => {
    expect(PatientSchema.safeParse(validPatient).success).toBe(true);
  });

  it('rejeita nome com menos de 2 caracteres', () => {
    expect(PatientSchema.safeParse({ ...validPatient, name: 'J' }).success).toBe(false);
  });

  it('aceita bloodType A+', () => {
    expect(PatientSchema.safeParse({ ...validPatient, bloodType: 'A+' }).success).toBe(true);
  });

  it('aceita todos os tipos sanguíneos válidos', () => {
    const types = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    for (const t of types) {
      expect(PatientSchema.safeParse({ ...validPatient, bloodType: t }).success).toBe(true);
    }
  });

  it('rejeita bloodType como string livre "A positivo"', () => {
    expect(PatientSchema.safeParse({ ...validPatient, bloodType: 'A positivo' }).success).toBe(false);
  });

  it('rejeita bloodType inválido "X+"', () => {
    expect(PatientSchema.safeParse({ ...validPatient, bloodType: 'X+' }).success).toBe(false);
  });

  it('aceita sex válido M, F, OTHER', () => {
    expect(PatientSchema.safeParse({ ...validPatient, sex: 'M' }).success).toBe(true);
    expect(PatientSchema.safeParse({ ...validPatient, sex: 'F' }).success).toBe(true);
    expect(PatientSchema.safeParse({ ...validPatient, sex: 'OTHER' }).success).toBe(true);
  });

  it('rejeita sex inválido', () => {
    expect(PatientSchema.safeParse({ ...validPatient, sex: 'MALE' }).success).toBe(false);
  });
});

// ── RedFlagSchema ─────────────────────────────────────────────

describe('RedFlagSchema', () => {
  const validRedFlag = {
    id: 'rf-001',
    type: 'Dor Torácica Aguda',
    description: 'Detectado: dor no peito',
    severity: 'critical' as const,
  };

  it('aceita red flag válida com campos obrigatórios', () => {
    expect(RedFlagSchema.safeParse(validRedFlag).success).toBe(true);
  });

  it('rejeita severity inválida', () => {
    expect(RedFlagSchema.safeParse({ ...validRedFlag, severity: 'extreme' }).success).toBe(false);
  });

  it('aceita severity high e moderate além de critical', () => {
    expect(RedFlagSchema.safeParse({ ...validRedFlag, severity: 'high' }).success).toBe(true);
    expect(RedFlagSchema.safeParse({ ...validRedFlag, severity: 'moderate' }).success).toBe(true);
  });

  it('aceita campos opcionais ruleTriggered e recommendation', () => {
    const withOptionals = {
      ...validRedFlag,
      ruleTriggered: 'rf-cardio-01',
      recommendation: 'Encaminhar para emergência',
      dataPoints: ['dor no peito', 'peito apertado'],
    };
    expect(RedFlagSchema.safeParse(withOptionals).success).toBe(true);
  });
});

// ── PrioritySchema ────────────────────────────────────────────

describe('PrioritySchema', () => {
  const valid = ['IMMEDIATE', 'URGENT', 'HIGH', 'MODERATE', 'ROUTINE', 'LOW'];

  it('aceita todos os valores válidos de Priority', () => {
    for (const p of valid) {
      expect(PrioritySchema.safeParse(p).success).toBe(true);
    }
  });

  it('rejeita valor fora do enum', () => {
    expect(PrioritySchema.safeParse('CRITICAL').success).toBe(false);
    expect(PrioritySchema.safeParse('normal').success).toBe(false);
    expect(PrioritySchema.safeParse('').success).toBe(false);
  });
});

// ── AgentInterviewOutputSchema ────────────────────────────────

describe('AgentInterviewOutputSchema', () => {
  const validInterview = {
    sessionComplete: false,
    questionsAsked: ['Qual é sua queixa principal?'],
    symptomsExtracted: [],
    dataGaps: ['Intensidade do sintoma'],
    confidence: 0.75,
  };

  it('aceita output de entrevista válido', () => {
    expect(AgentInterviewOutputSchema.safeParse(validInterview).success).toBe(true);
  });

  it('rejeita confidence acima de 1', () => {
    expect(AgentInterviewOutputSchema.safeParse({ ...validInterview, confidence: 1.5 }).success).toBe(false);
  });

  it('rejeita confidence negativo', () => {
    expect(AgentInterviewOutputSchema.safeParse({ ...validInterview, confidence: -0.1 }).success).toBe(false);
  });

  it('aplica defaults para arrays quando ausentes', () => {
    const minimal = { sessionComplete: false, confidence: 0.5 };
    const result = AgentInterviewOutputSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.data.questionsAsked)).toBe(true);
      expect(Array.isArray(result.data.symptomsExtracted)).toBe(true);
      expect(Array.isArray(result.data.dataGaps)).toBe(true);
    }
  });
});
