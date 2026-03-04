// ============================================================
// POPULATION HEALTH AGENTS - AI Agent Orchestration for Population Health Module
// ============================================================

import ZAI from 'z-ai-web-dev-sdk';
import {
  AgentEpidemiologicalOutput,
  AgentEpidemiologicalOutputSchema,
  AgentRecommendationOutput,
  AgentRecommendationOutputSchema,
  AgentNarrativeOutput,
  AgentNarrativeOutputSchema,
  RiskLevel,
} from '../schemas/pophealth';
import { withAgentResilience } from './agent-wrapper';

// ============================================================
// TYPES AND INTERFACES
// ============================================================

interface TerritoryContext {
  regionId: string;
  regionName: string;
  totalPopulation: number;
  municipalities: Array<{
    name: string;
    population: number;
    riskScore: number;
    riskLevel: string;
  }>;
  indicators: Array<{
    code: string;
    name: string;
    value: number;
    unit: string;
    trend: string;
    period: string;
  }>;
  riskProfiles: Array<{
    category: string;
    riskScore: number;
    riskLevel: RiskLevel;
    trendDirection: string;
    contributingFactors: string[];
  }>;
  alerts: Array<{
    type: string;
    description: string;
    severity: string;
  }>;
}

interface AgentResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  processingMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

// ============================================================
// EPIDEMIOLOGICAL INTERPRETATION AGENT
// ============================================================

const EPI_SYSTEM_PROMPT = `Você é um epidemiologista especializado em saúde pública brasileira. Sua função é interpretar dados epidemiológicos e territoriais para oferecer insights acionáveis para gestores de saúde.

CONTEXTO:
- Dados do SUS (DATASUS, SIH, SIM, SINAN)
- Indicadores de morbimortalidade
- Cobertura de atenção primária
- Perfil demográfico regional

REGRAS:
1. Baseie interpretações em evidências dos dados
2. Identifique padrões e tendências
3. Destaque anomalias e preocupações
4. Sugira investigações adicionais quando necessário
5. Use linguagem técnica acessível para gestores
6. Indique sempre o nível de confiança

OUTPUT ESTRUTURADO:
- Interpretação geral
- Achados principais
- Tendências identificadas
- Anomalias detectadas
- Avaliação de risco
- Limitações dos dados`;

export async function epidemiologicalAgent(
  context: TerritoryContext
): Promise<AgentResult<AgentEpidemiologicalOutput>> {
  const startTime = Date.now();
  
  try {
    const zai = await ZAI.create();
    
    const indicatorsSummary = context.indicators.map(i => 
      `${i.name}: ${i.value} ${i.unit} (tendência: ${i.trend})`
    ).join('\n');
    
    const riskSummary = context.riskProfiles.map(r => 
      `${r.category}: score ${r.riskScore}, nível ${r.riskLevel}, tendência ${r.trendDirection}`
    ).join('\n');
    
    const municipalitiesRisk = context.municipalities
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5)
      .map(m => `${m.name}: risco ${m.riskScore}`)
      .join('\n');

    const userPrompt = `DADOS TERRITORIAIS:
Região: ${context.regionName}
População Total: ${context.totalPopulation.toLocaleString()}

INDICADORES:
${indicatorsSummary}

PERFIS DE RISCO:
${riskSummary}

MUNICÍPIOS COM MAIOR RISCO:
${municipalitiesRisk}

ALERTAS ATIVOS:
${context.alerts.length > 0 ? context.alerts.map(a => `- ${a.type}: ${a.description}`).join('\n') : 'Nenhum alerta ativo'}

Forneça uma análise epidemiológica estruturada em JSON:
{
  "interpretation": "interpretação geral dos dados",
  "keyFindings": ["achados principais"],
  "trends": [
    {
      "indicator": "nome do indicador",
      "direction": "aumentando/diminuindo/estável",
      "magnitude": 0.0,
      "significance": "alta/média/baixa"
    }
  ],
  "anomalies": [
    {
      "indicator": "indicador com anomalia",
      "description": "descrição da anomalia",
      "severity": "alta/média/baixa"
    }
  ],
  "riskAssessment": "avaliação de risco geral",
  "confidence": 0.0-1.0,
  "dataLimitations": ["limitações identificadas"]
}`;

    const agentResult = await withAgentResilience(
      () => zai.chat.completions.create({
        messages: [
          { role: 'system', content: EPI_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
      { agentType: 'pophealth_epidemiological', sessionId: undefined, timeoutMs: 30000 }
    );
    if (!agentResult.success) {
      throw new Error(agentResult.error);
    }
    const completion = agentResult.data;

    const responseText = completion.choices[0]?.message?.content || '';
    
    let parsedOutput: AgentEpidemiologicalOutput;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      const parsed = JSON.parse(jsonStr);
      
      parsedOutput = {
        interpretation: parsed.interpretation || 'Análise não disponível',
        keyFindings: parsed.keyFindings || [],
        trends: parsed.trends || [],
        anomalies: parsed.anomalies || [],
        riskAssessment: parsed.riskAssessment || '',
        confidence: parsed.confidence || 0.5,
        dataLimitations: parsed.dataLimitations || [],
      };
    } catch {
      parsedOutput = {
        interpretation: 'Não foi possível processar a análise epidemiológica',
        keyFindings: [],
        trends: [],
        anomalies: [],
        riskAssessment: 'Dados insuficientes para avaliação',
        confidence: 0.3,
        dataLimitations: ['Erro no processamento da resposta'],
      };
    }

    const validated = AgentEpidemiologicalOutputSchema.parse(parsedOutput);

    return {
      success: true,
      data: validated,
      processingMs: Date.now() - startTime,
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingMs: Date.now() - startTime,
    };
  }
}

// ============================================================
// RECOMMENDATION AGENT
// ============================================================

const RECOMMENDATION_SYSTEM_PROMPT = `Você é um especialista em gestão de saúde pública brasileira. Sua função é gerar recomendações acionáveis baseadas em dados epidemiológicos e perfis de risco territorial.

TIPOS DE RECOMENDAÇÃO:
1. Campanhas de prevenção
2. Busca ativa
3. Reforço de capacidade
4. Redistribuição de recursos
5. Priorização de acompanhamento
6. Educação em saúde

REGRAS:
1. Recomendações devem ser específicas e acionáveis
2. Justifique cada recomendação com dados
3. Indique nível de confiança
4. Estime impacto esperado
5. Considere viabilidade operacional
6. Priorize por impacto e urgência

OUTPUT:
Para cada recomendação:
- Tipo e título
- Descrição detalhada
- Justificativa baseada em dados
- Indicadores-alvo
- Impacto esperado
- Nível de confiança
- Prioridade`;

export async function recommendationAgent(
  context: TerritoryContext,
  epiAnalysis: AgentEpidemiologicalOutput
): Promise<AgentResult<AgentRecommendationOutput>> {
  const startTime = Date.now();
  
  try {
    const zai = await ZAI.create();
    
    const highRiskAreas = context.municipalities
      .filter(m => m.riskScore > 60)
      .map(m => m.name);

    const userPrompt = `CONTEXTO TERRITORIAL:
Região: ${context.regionName}
População: ${context.totalPopulation.toLocaleString()}

ANÁLISE EPIDEMIOLÓGICA:
${epiAnalysis.interpretation}

ACHADOS PRINCIPAIS:
${epiAnalysis.keyFindings.join('\n')}

TENDÊNCIAS:
${epiAnalysis.trends.map(t => `${t.indicator}: ${t.direction} (${t.significance})`).join('\n')}

ANOMALIAS:
${epiAnalysis.anomalies.map(a => `${a.indicator}: ${a.description}`).join('\n')}

ÁREAS DE ALTO RISCO:
${highRiskAreas.join(', ') || 'Nenhuma área com risco crítico'}

PERFIS DE RISCO:
${context.riskProfiles.map(r => `${r.category}: ${r.riskLevel} (${r.trendDirection})`).join('\n')}

Gere recomendações de saúde coletiva em JSON:
{
  "recommendations": [
    {
      "regionId": "${context.regionId}",
      "recommendationType": "tipo",
      "title": "título",
      "description": "descrição detalhada",
      "rationale": "justificativa",
      "targetIndicator": "indicador-alvo",
      "expectedImpact": "impacto esperado",
      "confidenceLevel": 0.0-1.0,
      "priority": 1-5
    }
  ],
  "priorityRanking": ["ordem de prioridade"],
  "rationale": "justificativa geral das recomendações",
  "expectedImpact": "impacto esperado geral",
  "implementationNotes": ["notas para implementação"],
  "confidence": 0.0-1.0,
  "dataUsed": ["indicadores utilizados"],
  "limitations": ["limitações"]
}`;

    const agentResult = await withAgentResilience(
      () => zai.chat.completions.create({
        messages: [
          { role: 'system', content: RECOMMENDATION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2500,
      }),
      { agentType: 'pophealth_recommendation', sessionId: undefined, timeoutMs: 30000 }
    );
    if (!agentResult.success) {
      throw new Error(agentResult.error);
    }
    const completion = agentResult.data;

    const responseText = completion.choices[0]?.message?.content || '';
    
    let parsedOutput: AgentRecommendationOutput;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      const parsed = JSON.parse(jsonStr);
      
      parsedOutput = {
        recommendations: parsed.recommendations || [],
        priorityRanking: parsed.priorityRanking || [],
        rationale: parsed.rationale || '',
        expectedImpact: parsed.expectedImpact || '',
        implementationNotes: parsed.implementationNotes || [],
        confidence: parsed.confidence || 0.5,
        dataUsed: parsed.dataUsed || [],
        limitations: parsed.limitations || [],
      };
    } catch {
      parsedOutput = {
        recommendations: [],
        priorityRanking: [],
        rationale: 'Não foi possível gerar recomendações estruturadas',
        expectedImpact: 'Avaliação necessária',
        implementationNotes: [],
        confidence: 0.3,
        dataUsed: [],
        limitations: ['Erro no processamento'],
      };
    }

    const validated = AgentRecommendationOutputSchema.parse(parsedOutput);

    return {
      success: true,
      data: validated,
      processingMs: Date.now() - startTime,
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingMs: Date.now() - startTime,
    };
  }
}

// ============================================================
// NARRATIVE AGENT (Dashboard Executive Summary)
// ============================================================

const NARRATIVE_SYSTEM_PROMPT = `Você é um especialista em comunicação de dados de saúde pública para gestores. Sua função é transformar dados complexos em narrativas executivas claras e acionáveis.

PÚBLICO-ALVO:
- Gestores de saúde regionais
- Secretários de saúde
- Coordenadores de atenção primária

REGRAS:
1. Linguagem clara e direta
2. Destaque o que é mais importante
3. Use comparações e contextos
4. Seja específico com números
5. Termine com próximos passos
6. Evite jargão excessivo

ESTRUTURA:
1. Resumo executivo (2-3 frases)
2. Métricas-chave
3. Destaques positivos
4. Preocupações
5. Ações recomendadas`;

export async function narrativeAgent(
  context: TerritoryContext,
  epiAnalysis: AgentEpidemiologicalOutput,
  recommendations: AgentRecommendationOutput
): Promise<AgentResult<AgentNarrativeOutput>> {
  const startTime = Date.now();
  
  try {
    const zai = await ZAI.create();
    
    const userPrompt = `DADOS TERRITORIAIS:
Região: ${context.regionName}
População: ${context.totalPopulation.toLocaleString()}
Municípios: ${context.municipalities.length}

INDICADORES PRINCIPAIS:
${context.indicators.slice(0, 5).map(i => `${i.name}: ${i.value} ${i.unit}`).join('\n')}

ANÁLISE EPIDEMIOLÓGICA:
${epiAnalysis.interpretation}

ACHADOS:
${epiAnalysis.keyFindings.join('\n')}

RECOMENDAÇÕES:
${recommendations.recommendations.slice(0, 3).map(r => r.title).join('\n')}

ALERTAS:
${context.alerts.length > 0 ? context.alerts.map(a => `${a.type}: ${a.description}`).join('\n') : 'Nenhum'}

Gere uma narrativa executiva em JSON:
{
  "executiveSummary": "resumo em 2-3 frases",
  "keyMetrics": [
    {
      "name": "nome da métrica",
      "value": "valor formatado",
      "trend": "tendência",
      "interpretation": "interpretação"
    }
  ],
  "highlights": ["pontos positivos"],
  "concerns": ["preocupações"],
  "recommendedActions": ["ações recomendadas"],
  "narrative": "texto narrativo completo para o dashboard"
}`;

    const agentResult = await withAgentResilience(
      () => zai.chat.completions.create({
        messages: [
          { role: 'system', content: NARRATIVE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 2000,
      }),
      { agentType: 'pophealth_narrative', sessionId: undefined, timeoutMs: 30000 }
    );
    if (!agentResult.success) {
      throw new Error(agentResult.error);
    }
    const completion = agentResult.data;

    const responseText = completion.choices[0]?.message?.content || '';
    
    let parsedOutput: AgentNarrativeOutput;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      const parsed = JSON.parse(jsonStr);
      
      parsedOutput = {
        executiveSummary: parsed.executiveSummary || 'Análise não disponível',
        keyMetrics: parsed.keyMetrics || [],
        highlights: parsed.highlights || [],
        concerns: parsed.concerns || [],
        recommendedActions: parsed.recommendedActions || [],
        narrative: parsed.narrative || '',
      };
    } catch {
      parsedOutput = {
        executiveSummary: 'Não foi possível gerar resumo executivo',
        keyMetrics: [],
        highlights: [],
        concerns: [],
        recommendedActions: [],
        narrative: 'Erro no processamento da narrativa',
      };
    }

    const validated = AgentNarrativeOutputSchema.parse(parsedOutput);

    return {
      success: true,
      data: validated,
      processingMs: Date.now() - startTime,
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingMs: Date.now() - startTime,
    };
  }
}

// ============================================================
// RISK SCORING ENGINE
// ============================================================

export function calculateRiskScore(
  indicators: Array<{ value: number; category: string }>,
  weights?: Record<string, number>
): { score: number; level: RiskLevel } {
  const defaultWeights: Record<string, number> = {
    morbidity: 0.3,
    mortality: 0.25,
    coverage: -0.15, // Higher coverage = lower risk
    access: -0.1,
    capacity: -0.1,
    demographic: 0.1,
    ...weights,
  };
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const indicator of indicators) {
    const weight = defaultWeights[indicator.category] || 0.1;
    // Normalize value to 0-100 scale
    const normalizedValue = Math.min(100, Math.max(0, indicator.value));
    weightedSum += normalizedValue * Math.abs(weight);
    totalWeight += Math.abs(weight);
  }
  
  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
  
  let level: RiskLevel;
  if (score >= 80) level = 'CRITICAL';
  else if (score >= 65) level = 'VERY_HIGH';
  else if (score >= 50) level = 'HIGH';
  else if (score >= 35) level = 'MODERATE';
  else if (score >= 20) level = 'LOW';
  else level = 'VERY_LOW';
  
  return { score, level };
}

// ============================================================
// ANOMALY DETECTION
// ============================================================

export function detectAnomalies(
  values: Array<{ period: string; value: number }>,
  threshold: number = 2
): Array<{ period: string; value: number; expected: number; deviation: number }> {
  if (values.length < 3) return [];
  
  const mean = values.reduce((sum, v) => sum + v.value, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v.value - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  const anomalies: Array<{ period: string; value: number; expected: number; deviation: number }> = [];
  
  for (const v of values) {
    const deviation = Math.abs(v.value - mean) / (stdDev || 1);
    if (deviation > threshold) {
      anomalies.push({
        period: v.period,
        value: v.value,
        expected: Math.round(mean * 100) / 100,
        deviation: Math.round(deviation * 100) / 100,
      });
    }
  }
  
  return anomalies;
}

// ============================================================
// ORCHESTRATOR
// ============================================================

export async function orchestratePopulationHealthAnalysis(
  context: TerritoryContext
): Promise<{
  epiResult: AgentResult<AgentEpidemiologicalOutput>;
  recommendationResult?: AgentResult<AgentRecommendationOutput>;
  narrativeResult?: AgentResult<AgentNarrativeOutput>;
}> {
  // Step 1: Epidemiological Analysis
  const epiResult = await epidemiologicalAgent(context);
  
  // Step 2: Recommendations based on Epi Analysis
  let recommendationResult: AgentResult<AgentRecommendationOutput> | undefined;
  let narrativeResult: AgentResult<AgentNarrativeOutput> | undefined;
  
  if (epiResult.success && epiResult.data) {
    recommendationResult = await recommendationAgent(context, epiResult.data);
    
    // Step 3: Narrative for Dashboard
    if (recommendationResult.success && recommendationResult.data) {
      narrativeResult = await narrativeAgent(context, epiResult.data, recommendationResult.data);
    }
  }
  
  return {
    epiResult,
    recommendationResult,
    narrativeResult,
  };
}
