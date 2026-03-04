/**
 * Testes para o motor de detecção de Red Flags
 * Verifica tratamento de negações e contexto de terceiros
 */
import { describe, it, expect } from 'vitest';
import { detectRedFlags } from './clinical-agents';

// Mock do contexto clínico
const createMockContext = (chatHistory: Array<{ role: string; content: string }> = []) => ({
  patientId: 'test-patient',
  sessionId: 'test-session',
  symptoms: [],
  history: { conditions: [], medications: [], allergies: [] },
  demographics: { name: 'Paciente Teste', age: 30, sex: 'M' },
  chatHistory,
  previousMessages: chatHistory.map(m => m.content).join('\n'),
});

// Mock das regras de red flag (simplificado para testes)
vi.mock('../../../demo-data/seed', () => ({
  redFlagRules: [
    {
      id: 'rf-chest-pain',
      name: 'Dor Torácica',
      keywords: ['dor no peito', 'dor torácica', 'aperto no peito'],
      conditions: [],
      severity: 'critical',
      recommendation: 'Avaliação imediata',
    },
    {
      id: 'rf-breathing',
      name: 'Dificuldade Respiratória',
      keywords: ['falta de ar', 'dificuldade para respirar', 'sem fôlego'],
      conditions: [],
      severity: 'critical',
      recommendation: 'Avaliação imediata',
    },
    {
      id: 'rf-syncope',
      name: 'Síncope/Desmaio',
      keywords: ['desmaio', 'perda de consciência', 'síncope'],
      conditions: [],
      severity: 'high',
      recommendation: 'Investigar causas',
    },
  ],
}));

import { vi } from 'vitest';

describe('detectRedFlags', () => {
  describe('Detecção básica', () => {
    it('deve detectar dor no peito', () => {
      const symptoms = [{ symptomName: 'dor no peito', severity: 8 }];
      const context = createMockContext();
      const result = detectRedFlags(symptoms, context);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('Dor Torácica');
    });

    it('deve detectar variação coloquial "aperto no peito"', () => {
      const symptoms = [{ symptomName: 'aperto no peito', severity: 7 }];
      const context = createMockContext();
      const result = detectRedFlags(symptoms, context);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('Dor Torácica');
    });
  });

  describe('Tratamento de negações', () => {
    it('NÃO deve detectar red flag quando o paciente nega o sintoma', () => {
      const symptoms = [{ symptomName: 'tosse', severity: 3 }];
      const context = createMockContext([
        { role: 'USER', content: 'Não tenho dor no peito' },
        { role: 'ASSISTANT', content: 'Entendido' },
      ]);
      const result = detectRedFlags(symptoms, context);

      // Não deve detectar dor no peito porque foi negado
      expect(result.find(rf => rf.type === 'Dor Torácica')).toBeUndefined();
    });

    it('NÃO deve detectar quando paciente diz "nunca tive falta de ar"', () => {
      const symptoms = [{ symptomName: 'tosse', severity: 3 }];
      const context = createMockContext([
        { role: 'USER', content: 'Nunca tive falta de ar nem dificuldade para respirar' },
      ]);
      const result = detectRedFlags(symptoms, context);

      expect(result.find(rf => rf.type === 'Dificuldade Respiratória')).toBeUndefined();
    });

    it('deve detectar quando paciente confirma o sintoma', () => {
      const symptoms = [{ symptomName: 'tosse', severity: 3 }];
      const context = createMockContext([
        { role: 'USER', content: 'Estou sentindo dor no peito há 2 dias' },
      ]);
      const result = detectRedFlags(symptoms, context);

      expect(result.find(rf => rf.type === 'Dor Torácica')).toBeDefined();
    });
  });

  describe('Contexto de terceiros', () => {
    it('NÃO deve detectar red flag quando o sintoma é de familiar', () => {
      const symptoms = [{ symptomName: 'tosse', severity: 3 }];
      const context = createMockContext([
        { role: 'USER', content: 'Minha mãe teve dor no peito ontem' },
      ]);
      const result = detectRedFlags(symptoms, context);

      // Não deve detectar como red flag do paciente
      expect(result.find(rf => rf.type === 'Dor Torácica')).toBeUndefined();
    });

    it('NÃO deve detectar quando é histórico familiar', () => {
      const symptoms = [{ symptomName: 'tosse', severity: 3 }];
      const context = createMockContext([
        { role: 'USER', content: 'Histórico familiar de problemas cardíacos' },
      ]);
      const result = detectRedFlags(symptoms, context);

      // Histórico familiar não é red flag do paciente
      expect(result.find(rf => rf.type === 'Dor Torácica')).toBeUndefined();
    });

    it('deve detectar quando o sintoma é do próprio paciente', () => {
      const symptoms = [{ symptomName: 'falta de ar', severity: 7 }];
      const context = createMockContext([
        { role: 'USER', content: 'Estou com falta de ar desde ontem' },
      ]);
      const result = detectRedFlags(symptoms, context);

      expect(result.find(rf => rf.type === 'Dificuldade Respiratória')).toBeDefined();
    });
  });

  describe('Múltiplos sintomas', () => {
    it('deve detectar múltiplas red flags simultaneamente', () => {
      const symptoms = [
        { symptomName: 'dor no peito', severity: 8 },
        { symptomName: 'falta de ar', severity: 7 },
      ];
      const context = createMockContext();
      const result = detectRedFlags(symptoms, context);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Edge cases e cobertura coloquial', () => {
    it('deve detectar "peito apertado" como variação coloquial de dor torácica', () => {
      const context = createMockContext([
        { role: 'USER', content: 'Estou com o peito apertado desde esta manhã' },
      ]);
      const result = detectRedFlags([], context);
      expect(result.find(rf => rf.type === 'Dor Torácica')).toBeDefined();
    });

    it('deve detectar "sem fôlego" como variação coloquial de dificuldade respiratória', () => {
      const context = createMockContext([
        { role: 'USER', content: 'Estou sem fôlego quando subo escada' },
      ]);
      const result = detectRedFlags([], context);
      expect(result.find(rf => rf.type === 'Dificuldade Respiratória')).toBeDefined();
    });

    it('NÃO deve duplicar red flags quando múltiplas keywords da mesma regra são encontradas', () => {
      const symptoms = [
        { symptomName: 'dor no peito' },
        { symptomName: 'dor torácica' },
      ];
      const result = detectRedFlags(symptoms, createMockContext());
      const cardioFlags = result.filter(rf => rf.type === 'Dor Torácica');
      expect(cardioFlags.length).toBe(1);
    });

    it('deve retornar array vazio para sintomas sem red flags conhecidos', () => {
      const symptoms = [{ symptomName: 'coriza leve', severity: 2 }];
      const result = detectRedFlags(symptoms, createMockContext());
      expect(result).toHaveLength(0);
    });

    it('deve funcionar corretamente com arrays de sintomas e histórico vazios', () => {
      const result = detectRedFlags([], createMockContext());
      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('NÃO deve disparar red flag para negação "nega dor no peito"', () => {
      const context = createMockContext([
        { role: 'USER', content: 'Nega dor no peito, nega falta de ar' },
      ]);
      const result = detectRedFlags([], context);
      expect(result.find(rf => rf.type === 'Dor Torácica')).toBeUndefined();
      expect(result.find(rf => rf.type === 'Dificuldade Respiratória')).toBeUndefined();
    });

    it('deve detectar múltiplos sintomas diferentes simultâneos', () => {
      const symptoms = [
        { symptomName: 'dor no peito', severity: 9 },
        { symptomName: 'falta de ar', severity: 8 },
        { symptomName: 'desmaio', severity: 7 },
      ];
      const result = detectRedFlags(symptoms, createMockContext());
      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });
});
