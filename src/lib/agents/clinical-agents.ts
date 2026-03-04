// ============================================================
// CLINICAL AGENTS - AI Agent Orchestration for Clinical Module
// ============================================================

import ZAI from 'z-ai-web-dev-sdk';
import { 
  AgentInterviewOutput, 
  AgentInterviewOutputSchema,
  AgentTriageOutput,
  AgentTriageOutputSchema,
  AgentSummaryOutput,
  AgentSummaryOutputSchema,
  AgentHypothesisOutput,
  AgentHypothesisOutputSchema,
  RedFlag
} from '../schemas/clinical';
import { redFlagRules } from '../../../demo-data/seed';
import { withAgentResilience } from './agent-wrapper';

// ============================================================
// TYPES AND INTERFACES
// ============================================================

interface ClinicalContext {
  patientId: string;
  sessionId: string;
  symptoms: Array<{
    symptomName: string;
    severity?: number;
    onsetDuration?: string;
    bodySite?: string;
    character?: string;
    aggravatingFactors?: string[];
    relievingFactors?: string[];
    progression?: string;
  }>;
  history: {
    conditions: Array<{ name: string; code?: string; status: string }>;
    medications: Array<{ name: string; dosage?: string; frequency?: string }>;
    allergies: Array<{ substance: string; reaction?: string; severity?: string }>;
  };
  demographics: {
    name: string;
    age: number;
    sex?: string;
  };
  chatHistory: Array<{ role: string; content: string }>;
  previousMessages: string;
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
// PRÉ-PROCESSADORES DE LINGUAGEM CLÍNICA
// ============================================================

/** Padrões de negação em português brasileiro */
const NEGATION_PATTERNS = [
  /não\s+(\w+(?:\s+\w+){0,3})/gi,
  /nunca\s+(\w+(?:\s+\w+){0,3})/gi,
  /jamais\s+(\w+(?:\s+\w+){0,3})/gi,
  /sem\s+(\w+(?:\s+\w+){0,2})/gi,
  /nega\s+(\w+(?:\s+\w+){0,3})/gi,
  /nega ter\s+(\w+(?:\s+\w+){0,3})/gi,
  /não apresenta\s+(\w+(?:\s+\w+){0,3})/gi,
  /ausência de\s+(\w+(?:\s+\w+){0,2})/gi,
  /ausente[:\s]+(\w+(?:\s+\w+){0,2})/gi,
  /nenhum[a]?\s+(\w+(?:\s+\w+){0,2})/gi,
];

/** Padrões de contexto de terceiros */
const THIRD_PARTY_PATTERNS = [
  /minha?\s+mãe[^.!?]*/gi,
  /meu?\s+pai[^.!?]*/gi,
  /minha?\s+avó[^.!?]*/gi,
  /meu?\s+avô[^.!?]*/gi,
  /minha?\s+filh[ao][^.!?]*/gi,
  /meu?\s+filh[ao][^.!?]*/gi,
  /minha?\s+irmã[^.!?]*/gi,
  /meu?\s+irmão[^.!?]*/gi,
  /familiar[^.!?]*/gi,
  /parente[^.!?]*/gi,
  /ele\s+(teve|sofreu|apresentou)[^.!?]*/gi,
  /ela\s+(teve|sofreu|apresentou)[^.!?]*/gi,
  /histórico familiar de[^.!?]*/gi,
];

/** Variações coloquiais brasileiras para red flags */
const COLLOQUIAL_EXPANSIONS: Record<string, string[]> = {
  'dor no peito': ['peito apertado', 'aperto no peito', 'queimação no peito', 'pressão no peito', 'peso no peito', 'dor torácica'],
  'falta de ar': ['sem fôlego', 'ofegante', 'ofegando', 'não consigo respirar', 'difícil respirar', 'respiração curta', 'cansaço ao respirar'],
  'desmaio': ['apagou', 'desmaiou', 'perdeu os sentidos', 'ficou tonto e caiu', 'escureceu a vista e caiu', 'perda de consciência'],
  'cefaleia': ['dor de cabeça forte', 'cabeça latejando', 'dor de cabeça pior da vida', 'dor explodindo na cabeça'],
  'vômito': ['enjoo com vômito', 'está vomitando', 'não para de vomitar', 'vômito em jato'],
  'febre': ['febril', 'temperatura alta', 'corpo quente', 'calafrio com febre'],
};

/**
 * Remove ou isola trechos que se referem a terceiros para evitar falsos positivos.
 * Retorna texto com contextos de terceiros marcados como [TERCEIRO].
 */
function removeThirdPartyContext(text: string): string {
  let result = text;
  for (const pattern of THIRD_PARTY_PATTERNS) {
    result = result.replace(pattern, '[TERCEIRO]');
  }
  return result;
}

/**
 * Extrai termos que foram explicitamente negados pelo paciente.
 * Retorna lista de strings negadas para exclusão do matching de red flags.
 */
function extractNegatedTerms(text: string): string[] {
  const negatedTerms: string[] = [];
  for (const pattern of NEGATION_PATTERNS) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      if (match[1]) {
        negatedTerms.push(match[1].trim().toLowerCase());
      }
    }
  }
  return negatedTerms;
}

/**
 * Expande uma lista de keywords com variações coloquiais brasileiras.
 */
function expandWithColloquial(keywords: string[]): string[] {
  const expanded = [...keywords];
  for (const keyword of keywords) {
    const keyLower = keyword.toLowerCase();
    for (const [canonical, variants] of Object.entries(COLLOQUIAL_EXPANSIONS)) {
      if (keyLower.includes(canonical) || canonical.includes(keyLower)) {
        expanded.push(...variants);
      }
    }
  }
  return [...new Set(expanded)];
}

/**
 * Avalia o nível de confiança de um match de red flag.
 */
function assessMatchConfidence(
  keyword: string,
  originalKeywords: string[],
  isColloquial: boolean
): 'high' | 'medium' | 'low' {
  if (originalKeywords.map(k => k.toLowerCase()).includes(keyword.toLowerCase())) {
    return 'high';
  }
  if (isColloquial) {
    return 'medium';
  }
  return 'low';
}

// ============================================================
// RED FLAG DETECTION ENGINE
// ============================================================

export function detectRedFlags(
  symptoms: Array<{ symptomName: string; severity?: number; character?: string }>,
  context: ClinicalContext
): RedFlag[] {
  const detectedRedFlags: RedFlag[] = [];

  // Texto bruto combinado
  const rawText = [
    ...symptoms.map(s => `${s.symptomName} ${s.character || ''}`),
    ...context.chatHistory.map(m => m.content),
  ].join(' ').toLowerCase();

  // PASSO 1: remover contexto de terceiros
  const cleanedText = removeThirdPartyContext(rawText);

  // PASSO 2: extrair termos negados
  const negatedTerms = extractNegatedTerms(cleanedText);

  // PASSO 3: iterar regras de red flag
  for (const rule of redFlagRules) {
    // Expandir keywords com variações coloquiais
    const expandedKeywords = expandWithColloquial(rule.keywords);
    const originalKeywords = rule.keywords.map(k => k.toLowerCase());

    const matchedKeywords: string[] = [];
    let isColloquialMatch = false;

    for (const keyword of expandedKeywords) {
      const kwLower = keyword.toLowerCase();

      // Verificar se o termo está no texto limpo
      if (!cleanedText.includes(kwLower)) continue;

      // Verificar se o termo foi negado
      const isNegated = negatedTerms.some(
        negated => negated.includes(kwLower) || kwLower.includes(negated)
      );
      if (isNegated) continue;

      matchedKeywords.push(keyword);
      if (!originalKeywords.includes(kwLower)) {
        isColloquialMatch = true;
      }
    }

    if (matchedKeywords.length === 0) continue;

    // Verificar condições adicionais se necessário
    const conditionMatches = rule.conditions.filter(c =>
      cleanedText.includes(c.toLowerCase())
    );
    if (rule.conditions.length > 0 && conditionMatches.length === 0) continue;

    const confidence = assessMatchConfidence(
      matchedKeywords[0],
      originalKeywords,
      isColloquialMatch
    );

    detectedRedFlags.push({
      id: rule.id,
      type: rule.name,
      description: [
        `Detectado: ${matchedKeywords.join(', ')}.`,
        conditionMatches.length > 0 ? `Condições: ${conditionMatches.join(', ')}` : '',
        isColloquialMatch ? '(variação coloquial)' : '',
      ].filter(Boolean).join(' '),
      severity: rule.severity,
      ruleTriggered: rule.id,
      dataPoints: matchedKeywords,
      recommendation: rule.recommendation,
      // Nota: matchConfidence pode ser adicionado ao RedFlagSchema se necessário
    });
  }

  return detectedRedFlags;
}

// ============================================================
// CLINICAL INTERVIEW AGENT
// ============================================================

const INTERVIEW_SYSTEM_PROMPT = `Você é um assistente especializado em pré-consulta clínica para atenção primária no contexto brasileiro. Sua função é conduzir uma entrevista clínica estruturada de forma empática e eficiente.

REGRAS OBRIGATÓRIAS:
1. NUNCA faça diagnósticos - você está coletando informações
2. Sempre mantenha um tom acolhedor e profissional
3. Use linguagem simples e acessível
4. Identifique sinais de alerta (red flags) mas NÃO os ignore - continue coletando
5. Pergunte uma coisa de cada vez
6. Valide as respostas do paciente

ESTRUTURA DA ENTREVISTA:
1. Identificar o motivo principal da consulta
2. Caracterizar cada sintoma (OPQRST: Onset, Provocation, Quality, Radiation, Severity, Time)
3. Investigar antecedentes relevantes
4. Verificar medicações em uso
5. Confirmar alergias
6. Identificar fatores de risco
7. Verificar histórico familiar quando relevante

Responda sempre em português brasileiro. Seja conciso mas completo.`;

export async function clinicalInterviewAgent(
  message: string,
  context: ClinicalContext
): Promise<AgentResult<AgentInterviewOutput>> {
  const startTime = Date.now();
  
  try {
    const zai = await ZAI.create();
    
    // Build conversation context
    const conversationHistory = context.chatHistory
      .slice(-10) // Last 10 messages for context
      .map(m => `${m.role === 'USER' ? 'Paciente' : 'Assistente'}: ${m.content}`)
      .join('\n');
    
    const symptomsContext = context.symptoms.length > 0 
      ? `Sintomas já identificados: ${context.symptoms.map(s => s.symptomName).join(', ')}`
      : 'Nenhum sintoma identificado ainda.';
    
    const historyContext = context.history.conditions.length > 0
      ? `Condições conhecidas: ${context.history.conditions.map(c => c.name).join(', ')}`
      : '';
    
    const medicationsContext = context.history.medications.length > 0
      ? `Medicamentos em uso: ${context.history.medications.map(m => `${m.name} ${m.dosage || ''}`).join(', ')}`
      : '';
    
    const userPrompt = `CONTEXTO DO PACIENTE:
Nome: ${context.demographics.name}
Idade: ${context.demographics.age} anos
Sexo: ${context.demographics.sex || 'Não informado'}

${symptomsContext}
${historyContext}
${medicationsContext}

HISTÓRICO DA CONVERSA:
${conversationHistory}

NOVA MENSAGEM DO PACIENTE:
${message}

Analise a mensagem e forneça:
1. Uma resposta empática e profissional
2. Identifique se há novos sintomas ou informações clínicas
3. Avalie se a entrevista está completa ou se precisa de mais informações
4. Proponha a próxima pergunta se aplicável

Responda em formato JSON com a seguinte estrutura:
{
  "response": "sua resposta para o paciente",
  "symptomsExtracted": [...],
  "dataGaps": ["informações que ainda faltam"],
  "nextQuestion": "próxima pergunta sugerida",
  "sessionComplete": false,
  "confidence": 0.85,
  "reasoning": "seu raciocínio clínico"
}`;

    const agentResult = await withAgentResilience(
      () => zai.chat.completions.create({
        messages: [
          { role: 'system', content: INTERVIEW_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
      { agentType: 'clinical_interview', sessionId: context.sessionId, timeoutMs: 25000 }
    );
    if (!agentResult.success) {
      throw new Error(agentResult.error);
    }
    const completion = agentResult.data;

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Try to parse JSON from response
    let parsedOutput: AgentInterviewOutput;
    try {
      // Extract JSON if wrapped in markdown
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      const parsed = JSON.parse(jsonStr);
      
      parsedOutput = {
        sessionComplete: parsed.sessionComplete || false,
        questionsAsked: parsed.questionsAsked || [],
        symptomsExtracted: parsed.symptomsExtracted || [],
        dataGaps: parsed.dataGaps || [],
        recommendedFollowUp: parsed.recommendedFollowUp,
        nextQuestion: parsed.nextQuestion,
        confidence: parsed.confidence || 0.7,
        reasoning: parsed.reasoning,
      };
    } catch {
      // Fallback to text response
      parsedOutput = {
        sessionComplete: false,
        questionsAsked: [],
        symptomsExtracted: [],
        dataGaps: [],
        nextQuestion: responseText,
        confidence: 0.6,
        reasoning: 'Não foi possível estruturar completamente a resposta',
      };
    }

    // Validate output
    const validated = AgentInterviewOutputSchema.parse(parsedOutput);

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
// TRIAGE AGENT
// ============================================================

const TRIAGE_SYSTEM_PROMPT = `Você é um agente especializado em triagem clínica para atenção primária no Brasil. Sua função é avaliar o risco e prioridade de casos com base nos dados coletados.

REGRAS CRÍTICAS:
1. NUNCA faça diagnósticos definitivos
2. Sempre exiba nível de confiança/incerteza
3. Separe claramente: fatos informados, dados históricos, inferências, hipóteses
4. Red flags DEVEM ser sinalizadas como prioridade alta/encaminhamento imediato
5. NÃO prescreva tratamento
6. NÃO oriente conduta medicamentosa complexa

PRIORIDADES:
- IMMEDIATE: Risco de vida, emergência
- URGENT: Necessita avaliação nas próximas horas
- HIGH: Avaliação em até 24h
- MODERATE: Avaliação em até 72h
- ROUTINE: Consulta agendada normal
- LOW: Acompanhamento de rotina

Forneça sempre justificativa clara para sua classificação.`;

export async function triageAgent(
  context: ClinicalContext
): Promise<AgentResult<AgentTriageOutput>> {
  const startTime = Date.now();
  
  try {
    const zai = await ZAI.create();
    
    // Detect red flags using rule engine
    const detectedRedFlags = detectRedFlags(context.symptoms, context);
    
    const symptomsSummary = context.symptoms.map(s => 
      `${s.symptomName}: severidade ${s.severity || 'N/A'}, início ${s.onsetDuration || 'N/A'}`
    ).join('\n');
    
    const userPrompt = `DADOS DO PACIENTE:
Nome: ${context.demographics.name}
Idade: ${context.demographics.age} anos
Sexo: ${context.demographics.sex || 'Não informado'}

SINTOMAS ATUAIS:
${symptomsSummary || 'Nenhum sintoma reportado'}

HISTÓRICO CLÍNICO:
Condições: ${context.history.conditions.map(c => c.name).join(', ') || 'Nenhuma'}
Medicamentos: ${context.history.medications.map(m => m.name).join(', ') || 'Nenhum'}
Alergias: ${context.history.allergies.map(a => a.substance).join(', ') || 'Nenhuma'}

RED FLAGS DETECTADAS PELO MOTOR DE REGRAS:
${detectedRedFlags.length > 0 ? detectedRedFlags.map(rf => `- ${rf.type}: ${rf.description}`).join('\n') : 'Nenhuma red flag detectada'}

HISTÓRICO DA CONVERSA:
${context.previousMessages}

Analise este caso e forneça uma avaliação de triagem estruturada em formato JSON:
{
  "priority": "ROUTINE/MODERATE/HIGH/URGENT/IMMEDIATE",
  "urgencyScore": 0-100,
  "redFlags": [...],
  "riskFactors": ["fatores de risco identificados"],
  "protectiveFactors": ["fatores de proteção"],
  "dataCompleteness": 0-100,
  "confidenceScore": 0-1,
  "limitations": ["limitações da avaliação"],
  "recommendedAction": "ação recomendada",
  "clinicalReasoning": "raciocínio clínico detalhado",
  "escalationRequired": true/false
}`;

    const agentResult = await withAgentResilience(
      () => zai.chat.completions.create({
        messages: [
          { role: 'system', content: TRIAGE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
      { agentType: 'clinical_triage', sessionId: context.sessionId, timeoutMs: 25000 }
    );
    if (!agentResult.success) {
      throw new Error(agentResult.error);
    }
    const completion = agentResult.data;

    const responseText = completion.choices[0]?.message?.content || '';
    
    let parsedOutput: AgentTriageOutput;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      const parsed = JSON.parse(jsonStr);
      
      // Merge with detected red flags
      const allRedFlags = [...detectedRedFlags, ...(parsed.redFlags || [])];
      
      parsedOutput = {
        priority: parsed.priority || 'ROUTINE',
        urgencyScore: parsed.urgencyScore || 0,
        redFlags: allRedFlags,
        riskFactors: parsed.riskFactors || [],
        protectiveFactors: parsed.protectiveFactors || [],
        dataCompleteness: parsed.dataCompleteness || 50,
        confidenceScore: parsed.confidenceScore || 0.5,
        limitations: parsed.limitations || [],
        recommendedAction: parsed.recommendedAction || 'Continuar avaliação',
        clinicalReasoning: parsed.clinicalReasoning,
        escalationRequired: parsed.escalationRequired || allRedFlags.some(rf => rf.severity === 'critical'),
      };
    } catch {
      // Fallback with detected red flags
      parsedOutput = {
        priority: detectedRedFlags.some(rf => rf.severity === 'critical') ? 'URGENT' : 'ROUTINE',
        urgencyScore: detectedRedFlags.length * 20,
        redFlags: detectedRedFlags,
        riskFactors: [],
        protectiveFactors: [],
        dataCompleteness: 50,
        confidenceScore: 0.5,
        limitations: ['Não foi possível processar completamente a resposta da IA'],
        recommendedAction: 'Avaliação médica necessária',
        clinicalReasoning: 'Avaliação baseada em regras de red flag',
        escalationRequired: detectedRedFlags.some(rf => rf.severity === 'critical'),
      };
    }

    const validated = AgentTriageOutputSchema.parse(parsedOutput);

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
// CLINICAL SUMMARY AGENT
// ============================================================

const SUMMARY_SYSTEM_PROMPT = `Você é um agente especializado em gerar resumos clínicos estruturados para médicos na atenção primária brasileira.

REGRAS:
1. Seja objetivo e estruturado
2. Destaque informações críticas
3. Identifique lacunas de informação
4. Use terminologia clínica apropriada
5. Separe claramente fatos de inferências
6. Inclua alertas de segurança

ESTRUTURA DO RESUMO:
- Queixa principal
- História da doença atual (HDA)
- Antecedentes relevantes
- Medicamentos em uso
- Alergias
- Fatores de risco
- Exames prévios relevantes
- Lacunas de informação
- Sinais de alerta
- Prioridade do caso`;

export async function summaryAgent(
  context: ClinicalContext,
  triageResult: AgentTriageOutput
): Promise<AgentResult<AgentSummaryOutput>> {
  const startTime = Date.now();
  
  try {
    const zai = await ZAI.create();
    
    const symptomsSummary = context.symptoms.map(s => 
      `${s.symptomName}: ${s.onsetDuration || 'tempo não especificado'}, intensidade ${s.severity || 'não avaliada'}/10`
    ).join('\n');

    const userPrompt = `DADOS DO PACIENTE:
Nome: ${context.demographics.name}
Idade: ${context.demographics.age} anos
Sexo: ${context.demographics.sex || 'Não informado'}

MOTIVO DA CONSULTA:
${context.symptoms[0]?.symptomName || 'Não especificado'}

HISTÓRICO DA DOENÇA ATUAL:
${symptomsSummary || 'Informações insuficientes'}

ANTECEDENTES:
${context.history.conditions.map(c => `- ${c.name} (${c.status})`).join('\n') || 'Nenhum registrado'}

MEDICAMENTOS EM USO:
${context.history.medications.map(m => `- ${m.name} ${m.dosage || ''} ${m.frequency || ''}`).join('\n') || 'Nenhum registrado'}

ALERGIAS:
${context.history.allergies.map(a => `- ${a.substance}: ${a.reaction || 'Reação não especificada'}`).join('\n') || 'Nenhuma conhecida'}

RESULTADO DA TRIAGEM:
- Prioridade: ${triageResult.priority}
- Red Flags: ${triageResult.redFlags.length}
- Score de Urgência: ${triageResult.urgencyScore}

Gere um resumo clínico estruturado em JSON:
{
  "chiefComplaint": "queixa principal",
  "historyPresentIllness": "HDA detalhada",
  "relevantHistory": "antecedentes relevantes",
  "currentMedications": ["lista de medicamentos"],
  "allergiesSummary": "resumo de alergias",
  "riskFactorsSummary": "fatores de risco",
  "dataGaps": ["lacunas identificadas"],
  "pendingExams": ["exames pendentes ou necessários"],
  "alertFlags": ["alertas clínicos"],
  "summaryForPhysician": "resumo executivo para o médico",
  "keyPoints": ["pontos-chave"]
}`;

    const agentResult = await withAgentResilience(
      () => zai.chat.completions.create({
        messages: [
          { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
      { agentType: 'clinical_summary', sessionId: context.sessionId, timeoutMs: 30000 }
    );
    if (!agentResult.success) {
      throw new Error(agentResult.error);
    }
    const completion = agentResult.data;

    const responseText = completion.choices[0]?.message?.content || '';
    
    let parsedOutput: AgentSummaryOutput;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      const parsed = JSON.parse(jsonStr);
      
      parsedOutput = {
        chiefComplaint: parsed.chiefComplaint || context.symptoms[0]?.symptomName || 'Não especificado',
        historyPresentIllness: parsed.historyPresentIllness || 'Informações insuficientes',
        relevantHistory: parsed.relevantHistory || '',
        currentMedications: parsed.currentMedications || context.history.medications.map(m => m.name),
        allergiesSummary: parsed.allergiesSummary || context.history.allergies.map(a => a.substance).join(', ') || 'Nenhuma',
        riskFactorsSummary: parsed.riskFactorsSummary || '',
        dataGaps: parsed.dataGaps || [],
        pendingExams: parsed.pendingExams || [],
        alertFlags: parsed.alertFlags || triageResult.redFlags.map(rf => rf.type),
        summaryForPhysician: parsed.summaryForPhysician || 'Avaliação pendente',
        keyPoints: parsed.keyPoints || [],
      };
    } catch {
      parsedOutput = {
        chiefComplaint: context.symptoms[0]?.symptomName || 'Não especificado',
        historyPresentIllness: 'Não foi possível processar completamente',
        relevantHistory: context.history.conditions.map(c => c.name).join(', '),
        currentMedications: context.history.medications.map(m => m.name),
        allergiesSummary: context.history.allergies.map(a => a.substance).join(', ') || 'Nenhuma',
        riskFactorsSummary: '',
        dataGaps: ['Processamento incompleto'],
        pendingExams: [],
        alertFlags: triageResult.redFlags.map(rf => rf.type),
        summaryForPhysician: 'Verificar dados manualmente',
        keyPoints: [],
      };
    }

    const validated = AgentSummaryOutputSchema.parse(parsedOutput);

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
// DIFFERENTIAL HYPOTHESES AGENT
// ============================================================

const HYPOTHESIS_SYSTEM_PROMPT = `Você é um agente especializado em gerar hipóteses diagnósticas diferenciais para apoio à decisão clínica na atenção primária brasileira.

REGRAS CRÍTICAS:
1. NUNCA apresente hipóteses como diagnósticos definitivos
2. Sempre indique nível de confiança/incerteza
3. Liste evidências a favor E contra
4. Identifique dados faltantes para cada hipótese
5. Sugira investigação necessária
6. Indique urgência potencial de cada hipótese

FORMATO:
Para cada hipótese, forneça:
- Nome da condição
- Código CID-10 se aplicável
- Probabilidade estimada
- Evidências a favor
- Evidências contra/ausentes
- Dados faltantes
- Investigações sugeridas
- Urgência potencial`;

export async function hypothesisAgent(
  context: ClinicalContext,
  triageResult: AgentTriageOutput
): Promise<AgentResult<AgentHypothesisOutput>> {
  const startTime = Date.now();
  
  try {
    const zai = await ZAI.create();
    
    const symptomsText = context.symptoms.map(s => s.symptomName).join(', ');
    const conditionsText = context.history.conditions.map(c => c.name).join(', ');

    const userPrompt = `PACIENTE: ${context.demographics.name}, ${context.demographics.age} anos, ${context.demographics.sex || 'sexo não informado'}

QUEIXA PRINCIPAL: ${symptomsText}

CONDIÇÕES PRÉ-EXISTENTES: ${conditionsText || 'Nenhuma'}

MEDICAMENTOS: ${context.history.medications.map(m => m.name).join(', ') || 'Nenhum'}

RED FLAGS: ${triageResult.redFlags.map(rf => rf.type).join(', ') || 'Nenhuma'}

PRIORIDADE: ${triageResult.priority}

Gere hipóteses diagnósticas diferenciais em JSON:
{
  "hypotheses": [
    {
      "hypothesisName": "nome da hipótese",
      "icdCode": "código CID-10",
      "probability": 0.0-1.0,
      "confidenceLevel": "high/medium/low",
      "supportingEvidence": ["evidências a favor"],
      "contradictingEvidence": ["evidências contra"],
      "missingData": ["dados faltantes"],
      "suggestedWorkup": ["exames/investigações"],
      "urgency": "urgência potencial",
      "rankOrder": 1
    }
  ],
  "primaryHypothesis": "hipótese mais provável",
  "diagnosticApproach": "abordagem diagnóstica sugerida",
  "dataNeeded": ["dados adicionais necessários"],
  "confidence": 0.0-1.0,
  "limitations": "limitações desta análise"
}

IMPORTANTE: Estas são HIPÓTESES para apoio à decisão, não diagnósticos definitivos.`;

    const agentResult = await withAgentResilience(
      () => zai.chat.completions.create({
        messages: [
          { role: 'system', content: HYPOTHESIS_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
      { agentType: 'clinical_hypothesis', sessionId: context.sessionId, timeoutMs: 30000 }
    );
    if (!agentResult.success) {
      throw new Error(agentResult.error);
    }
    const completion = agentResult.data;

    const responseText = completion.choices[0]?.message?.content || '';
    
    let parsedOutput: AgentHypothesisOutput;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      const parsed = JSON.parse(jsonStr);
      
      parsedOutput = {
        hypotheses: parsed.hypotheses || [],
        primaryHypothesis: parsed.primaryHypothesis || 'Hipótese indeterminada',
        diagnosticApproach: parsed.diagnosticApproach || 'Investigação adicional necessária',
        dataNeeded: parsed.dataNeeded || [],
        confidence: parsed.confidence || 0.5,
        limitations: parsed.limitations || 'Análise baseada em dados limitados',
      };
    } catch {
      parsedOutput = {
        hypotheses: [],
        primaryHypothesis: 'Dados insuficientes para hipóteses',
        diagnosticApproach: 'Coletar mais informações',
        dataNeeded: ['História clínica completa', 'Exame físico', 'Exames complementares'],
        confidence: 0.3,
        limitations: 'Não foi possível processar as hipóteses',
      };
    }

    const validated = AgentHypothesisOutputSchema.parse(parsedOutput);

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
// ORCHESTRATOR
// ============================================================

export async function orchestratePreConsultation(
  message: string,
  context: ClinicalContext
): Promise<{
  interviewResponse: AgentResult<AgentInterviewOutput>;
  triageResult?: AgentResult<AgentTriageOutput>;
  summaryResult?: AgentResult<AgentSummaryOutput>;
  hypothesisResult?: AgentResult<AgentHypothesisOutput>;
}> {
  // Step 1: Clinical Interview
  const interviewResponse = await clinicalInterviewAgent(message, context);
  
  // Step 2: Triage (always run to check for red flags)
  const triageResult = await triageAgent(context);
  
  // Step 3: Summary and Hypotheses (only when interview is complete or red flags detected)
  let summaryResult: AgentResult<AgentSummaryOutput> | undefined;
  let hypothesisResult: AgentResult<AgentHypothesisOutput> | undefined;
  
  if (
    interviewResponse.data?.sessionComplete || 
    triageResult.data?.escalationRequired ||
    context.symptoms.length >= 3
  ) {
    if (triageResult.data) {
      // Executar summaryAgent e hypothesisAgent em paralelo para melhor performance
      const [summary, hypothesis] = await Promise.all([
        summaryAgent(context, triageResult.data),
        hypothesisAgent(context, triageResult.data),
      ]);
      summaryResult = summary;
      hypothesisResult = hypothesis;
    }
  }
  
  return {
    interviewResponse,
    triageResult,
    summaryResult,
    hypothesisResult,
  };
}
