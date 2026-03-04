/**
 * Testes unitários para funções puras do módulo de Saúde Populacional
 */
import { describe, it, expect } from 'vitest';
import { calculateRiskScore, detectAnomalies } from '../pophealth-agents';

// ── calculateRiskScore ────────────────────────────────────────

describe('calculateRiskScore', () => {
  it('retorna CRITICAL para score >= 80', () => {
    const result = calculateRiskScore([
      { value: 90, category: 'morbidity' },
      { value: 85, category: 'mortality' },
    ]);
    expect(result.level).toBe('CRITICAL');
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it('retorna VERY_HIGH para score entre 65 e 79', () => {
    const result = calculateRiskScore([
      { value: 70, category: 'morbidity' },
      { value: 68, category: 'mortality' },
    ]);
    expect(result.level).toBe('VERY_HIGH');
    expect(result.score).toBeGreaterThanOrEqual(65);
    expect(result.score).toBeLessThan(80);
  });

  it('retorna HIGH para score entre 50 e 64', () => {
    expect(calculateRiskScore([{ value: 55, category: 'morbidity' }]).level).toBe('HIGH');
  });

  it('retorna MODERATE para score entre 35 e 49', () => {
    expect(calculateRiskScore([{ value: 40, category: 'morbidity' }]).level).toBe('MODERATE');
  });

  it('retorna LOW para score entre 20 e 34', () => {
    expect(calculateRiskScore([{ value: 25, category: 'morbidity' }]).level).toBe('LOW');
  });

  it('retorna VERY_LOW para score < 20', () => {
    const result = calculateRiskScore([{ value: 5, category: 'morbidity' }]);
    expect(result.level).toBe('VERY_LOW');
    expect(result.score).toBeLessThan(20);
  });

  it('retorna score 50 e HIGH quando indicadores vazios (fallback)', () => {
    const result = calculateRiskScore([]);
    expect(result.score).toBe(50);
    expect(result.level).toBe('HIGH');
  });

  it('limita score a no máximo 100', () => {
    const result = calculateRiskScore([
      { value: 999, category: 'morbidity' },
      { value: 999, category: 'mortality' },
    ]);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('limita score a no mínimo 0', () => {
    expect(calculateRiskScore([{ value: -999, category: 'morbidity' }]).score).toBeGreaterThanOrEqual(0);
  });

  it('aceita múltiplas categorias simultâneas sem erro', () => {
    const result = calculateRiskScore([
      { value: 60, category: 'morbidity' },
      { value: 50, category: 'mortality' },
      { value: 80, category: 'coverage' },
      { value: 40, category: 'access' },
    ]);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(typeof result.level).toBe('string');
  });

  it('aceita pesos customizados sem lançar erro', () => {
    const result = calculateRiskScore(
      [{ value: 80, category: 'custom_metric' }],
      { custom_metric: 0.5 }
    );
    expect(typeof result.score).toBe('number');
  });
});

// ── detectAnomalies ───────────────────────────────────────────

describe('detectAnomalies', () => {
  it('retorna vazio para array vazio', () => {
    expect(detectAnomalies([])).toHaveLength(0);
  });

  it('retorna vazio para menos de 3 valores', () => {
    expect(detectAnomalies([
      { period: '2024-01', value: 10 },
      { period: '2024-02', value: 12 },
    ])).toHaveLength(0);
  });

  it('detecta spike claro acima do threshold padrão (2 desvios)', () => {
    const values = [
      { period: '2024-01', value: 10 },
      { period: '2024-02', value: 11 },
      { period: '2024-03', value: 10 },
      { period: '2024-04', value: 10 },
      { period: '2024-05', value: 80 },
    ];
    const anomalies = detectAnomalies(values);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].value).toBe(80);
  });

  it('detecta queda abrupta como anomalia', () => {
    const values = [
      { period: '2024-01', value: 80 },
      { period: '2024-02', value: 82 },
      { period: '2024-03', value: 79 },
      { period: '2024-04', value: 81 },
      { period: '2024-05', value: 5 },
    ];
    const anomalies = detectAnomalies(values);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].value).toBe(5);
  });

  it('não detecta anomalia em série estável', () => {
    expect(detectAnomalies([
      { period: '2024-01', value: 10 },
      { period: '2024-02', value: 11 },
      { period: '2024-03', value: 10 },
      { period: '2024-04', value: 11 },
      { period: '2024-05', value: 10 },
    ])).toHaveLength(0);
  });

  it('retorna period, expected e deviation corretos', () => {
    const values = [
      { period: '2024-01', value: 10 },
      { period: '2024-02', value: 10 },
      { period: '2024-03', value: 10 },
      { period: '2024-04', value: 10 },
      { period: '2024-05', value: 90 },
    ];
    const anomalies = detectAnomalies(values);
    expect(anomalies[0].period).toBe('2024-05');
    expect(typeof anomalies[0].expected).toBe('number');
    expect(typeof anomalies[0].deviation).toBe('number');
    expect(anomalies[0].deviation).toBeGreaterThan(0);
  });

  it('threshold mais baixo detecta mais anomalias', () => {
    const values = [
      { period: '2024-01', value: 10 },
      { period: '2024-02', value: 11 },
      { period: '2024-03', value: 10 },
      { period: '2024-04', value: 10 },
      { period: '2024-05', value: 20 },
    ];
    const sensivel = detectAnomalies(values, 1);
    const restrito = detectAnomalies(values, 5);
    expect(sensivel.length).toBeGreaterThanOrEqual(restrito.length);
  });

  it('não lança erro com todos os valores iguais (stdDev zero)', () => {
    expect(() => detectAnomalies([
      { period: '2024-01', value: 50 },
      { period: '2024-02', value: 50 },
      { period: '2024-03', value: 50 },
    ])).not.toThrow();
  });
});
