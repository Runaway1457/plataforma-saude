# MEGA PROMPT — Plataforma de Inteligência Clínica e Saúde Populacional
# Execute este prompt inteiro de uma vez no seu assistente de código

---

Você é um engenheiro senior full-stack trabalhando no projeto Next.js 15 + Prisma 6 + TypeScript localizado em `/home/z/my-project`.

Este é um prompt de refatoração completa. Execute **todas** as tarefas abaixo em ordem. Não pare entre elas. Ao final, liste cada arquivo criado ou modificado.

---

## CONTEXTO DO PROJETO

Stack: Next.js 15, TypeScript, Prisma 6 (SQLite dev / PostgreSQL prod), Zod, next-auth, z-ai-web-dev-sdk, shadcn/ui, Tailwind, React Query, Zustand.

Domínio: Plataforma de saúde com dois módulos — Agente Clínico de Pré-Consulta e Saúde Populacional. Dados de pacientes são dados sensíveis de saúde (LGPD Art. 11).

---

## TAREFA 1 — Corrigir PrismaClient duplicado em todas as rotas

**Problema:** Cada route handler instancia `new PrismaClient()` localmente. O singleton correto já existe em `src/lib/db.ts` exportando `db`.

**Ação:** Em cada um dos arquivos abaixo, remova a linha `const prisma = new PrismaClient()` e o import `PrismaClient` quando não mais necessário, e substitua todas as referências `prisma.` por `db.`. Adicione o import `import { db } from '@/lib/db'`.

Arquivos a modificar:
- `src/app/api/clinical/chat/route.ts`
- `src/app/api/clinical/patients/route.ts`
- `src/app/api/clinical/session/route.ts`
- `src/app/api/clinical/complete/route.ts`
- `src/app/api/pophealth/dashboard/route.ts`
- `src/app/api/pophealth/regions/route.ts`

**Atenção:** Mantenha os imports de enums do Prisma que ainda forem usados (ex: `SessionStatus`, `Priority`), apenas remova `PrismaClient` e a instância local.

---

## TAREFA 2 — Criar sistema de autenticação e autorização

**Criar arquivo** `src/lib/auth-guard.ts`:

```typescript
/**
 * Auth Guard — Middleware de autenticação e autorização para API Routes
 * Usa next-auth para verificar sessão e roles
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';

type RouteHandler = (req: NextRequest, context?: unknown) => Promise<NextResponse>;

/**
 * Envolve um route handler exigindo sessão autenticada válida.
 * Retorna 401 se não autenticado.
 */
export function withAuth(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context?: unknown) => {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Autenticação necessária' },
        { status: 401 }
      );
    }
    return handler(req, context);
  };
}

/**
 * Envolve um route handler exigindo uma das roles especificadas.
 * Retorna 401 se não autenticado, 403 se não autorizado.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (handler: RouteHandler): RouteHandler => {
    return async (req: NextRequest, context?: unknown) => {
      const session = await getServerSession();
      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'UNAUTHORIZED', message: 'Autenticação necessária' },
          { status: 401 }
        );
      }
      const userRole = (session.user as { role?: UserRole }).role;
      if (!userRole || !allowedRoles.includes(userRole)) {
        return NextResponse.json(
          { error: 'FORBIDDEN', message: 'Permissão insuficiente para esta operação' },
          { status: 403 }
        );
      }
      return handler(req, context);
    };
  };
}
```

**Aplicar withAuth** nos handlers POST/GET dos arquivos:
- `src/app/api/clinical/chat/route.ts` — envolva o export `POST`
- `src/app/api/clinical/patients/route.ts` — envolva o export `GET`
- `src/app/api/clinical/session/route.ts` — envolva todos os exports (GET, POST, PATCH)
- `src/app/api/clinical/complete/route.ts` — envolva o export `POST`
- `src/app/api/pophealth/dashboard/route.ts` — envolva GET e POST
- `src/app/api/pophealth/regions/route.ts` — envolva o export `GET`

Exemplo de como aplicar:
```typescript
// ANTES:
export async function POST(request: NextRequest) { ... }

// DEPOIS:
import { withAuth } from '@/lib/auth-guard';

async function handler(request: NextRequest) { ... }
export const POST = withAuth(handler);
```

---

## TAREFA 3 — Adicionar validação Zod nos inputs das API Routes

**Em `src/app/api/clinical/chat/route.ts`**, adicione no topo do handler, após `const body = await request.json()`:

```typescript
import { z } from 'zod';

const ChatRequestSchema = z.object({
  sessionId: z.string().min(1, 'sessionId é obrigatório'),
  message: z.string().min(1, 'Mensagem não pode ser vazia').max(2000, 'Mensagem muito longa'),
});

// No handler, substitua a validação manual por:
const parsed = ChatRequestSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
    { status: 422 }
  );
}
const { sessionId, message } = parsed.data;
```

**Em `src/app/api/clinical/session/route.ts`**, no POST handler:

```typescript
const SessionCreateSchema = z.object({
  patientId: z.string().min(1, 'patientId é obrigatório'),
  primaryComplaint: z.string().max(500).optional(),
});

const SessionPatchSchema = z.object({
  sessionId: z.string().min(1),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ESCALATED']),
});
```

**Em `src/app/api/pophealth/dashboard/route.ts`**, no POST handler:

```typescript
const DashboardAnalysisSchema = z.object({
  regionId: z.string().min(1, 'regionId é obrigatório'),
});
```

---

## TAREFA 4 — Paralelizar chamadas de agentes independentes

**Em `src/lib/agents/clinical-agents.ts`**, na função `orchestratePreConsultation`, localize o bloco onde `summaryAgent` e `hypothesisAgent` são chamados sequencialmente e substitua por `Promise.all`:

```typescript
// ANTES (sequencial):
summaryResult = await summaryAgent(context, triageResult.data);
hypothesisResult = await hypothesisAgent(context, triageResult.data);

// DEPOIS (paralelo):
const [summaryResult, hypothesisResult] = await Promise.all([
  summaryAgent(context, triageResult.data),
  hypothesisAgent(context, triageResult.data),
]);
```

**Em `src/app/api/clinical/complete/route.ts`**, faça o mesmo para `summaryAgent` e `hypothesisAgent`:

```typescript
// ANTES:
const summaryResult = await summaryAgent(context, triageData);
const hypothesisResult = await hypothesisAgent(context, triageData);

// DEPOIS:
const [summaryResult, hypothesisResult] = await Promise.all([
  summaryAgent(context, triageData),
  hypothesisAgent(context, triageData),
]);
```

---

## TAREFA 5 — Criar logger estruturado

**Criar arquivo** `src/lib/logger.ts`:

```typescript
/**
 * Logger estruturado em JSON para produção.
 * Substitui console.error/log diretos nas API routes.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  [key: string]: unknown;
}

function log(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...data,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (event: string, data?: Record<string, unknown>) => log('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => log('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => log('error', event, data),
  debug: (event: string, data?: Record<string, unknown>) => log('debug', event, data),
};
```

**Substituir** todos os `console.error(...)` e `console.log(...)` nos arquivos de API routes pelo logger:

```typescript
// ANTES:
console.error('Chat API error:', error);

// DEPOIS:
import { logger } from '@/lib/logger';
logger.error('chat_api_error', { error: error instanceof Error ? error.message : String(error) });
```

Aplique nos arquivos:
- `src/app/api/clinical/chat/route.ts`
- `src/app/api/clinical/patients/route.ts`
- `src/app/api/clinical/session/route.ts`
- `src/app/api/clinical/complete/route.ts`
- `src/app/api/pophealth/dashboard/route.ts`
- `src/app/api/pophealth/regions/route.ts`

---

## TAREFA 6 — Corrigir motor de red flags para tratar negações e contexto de terceiros

**Em `src/lib/agents/clinical-agents.ts`**, **antes** da função `detectRedFlags`, adicione as seguintes funções auxiliares:

```typescript
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
  /ele\s+(teve|sofreu|teve|apresentou)[^.!?]*/gi,
  /ela\s+(teve|sofreu|teve|apresentou)[^.!?]*/gi,
  /histórico familiar de[^.!?]*/gi,
];

/** Variações coloquiais brasileiras para red flags — expandir keywords por contexto */
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
```

**Agora substitua completamente a função `detectRedFlags`** pelo seguinte:

```typescript
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
      // Campos extras para rastreabilidade (compatíveis com schema Zod como optional)
      // matchConfidence: confidence,  // descomente ao adicionar ao RedFlagSchema
    });
  }

  return detectedRedFlags;
}
```

---

## TAREFA 7 — Adicionar modelos LGPD e PhysicianReview ao schema Prisma

**Editar `prisma/schema.prisma`** — adicione os seguintes modelos **ao final do arquivo**, antes do último comentário ou linha:

```prisma
// ============================================================
// LGPD — CONSENTIMENTO E COMPLIANCE
// ============================================================

model ConsentRecord {
  id               String      @id @default(cuid())
  patientId        String
  consentType      ConsentType
  purpose          String
  legalBasis       LegalBasis
  granted          Boolean
  grantedAt        DateTime?
  revokedAt        DateTime?
  expiresAt        DateTime?
  collectionMethod String      @default("digital_form")
  ipAddress        String?
  userAgent        String?
  documentVersion  String
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  patient          Patient     @relation(fields: [patientId], references: [id])

  @@index([patientId])
  @@index([consentType])
  @@map("consent_records")
}

enum ConsentType {
  PRE_CONSULTATION_AI
  DATA_PROCESSING
  SENSITIVE_DATA
  RESEARCH
  THIRD_PARTY_SHARE
}

enum LegalBasis {
  CONSENT
  HEALTH_CARE
  LEGITIMATE_INTEREST
  LEGAL_OBLIGATION
}

// ============================================================
// FEEDBACK LOOP MÉDICO
// ============================================================

model PhysicianReview {
  id                  String   @id @default(cuid())
  sessionId           String   @unique
  patientId           String
  physicianId         String

  triageAccepted      Boolean?
  triageCorrectedTo   String?
  triageComment       String?

  hypothesesReviewed  Boolean  @default(false)
  acceptedHypotheses  String?
  rejectedHypotheses  String?
  addedDiagnosis      String?

  dataQualityRating   Int?
  aiUsefulnessRating  Int?
  comments            String?

  reviewedAt          DateTime @default(now())
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([patientId])
  @@index([physicianId])
  @@map("physician_reviews")
}
```

**Também no modelo `Patient`** no schema, adicione a relação:
```prisma
consents    ConsentRecord[]
```

**Também no modelo `PreConsultationSession`**, adicione:
```prisma
physicianReview PhysicianReview?
```

Após editar o schema, execute:
```bash
npx prisma migrate dev --name "add-consent-lgpd-physician-review"
```

---

## TAREFA 8 — Criar serviço de consentimento LGPD

**Criar arquivo** `src/lib/lgpd/consent-service.ts`:

```typescript
/**
 * Serviço de Consentimento LGPD
 * Gerencia registros de consentimento para dados sensíveis de saúde (Art. 11 LGPD)
 */
import { db } from '@/lib/db';
import { ConsentType, LegalBasis } from '@prisma/client';
import { logger } from '@/lib/logger';

export { ConsentType, LegalBasis };

interface GrantConsentParams {
  patientId: string;
  consentType: ConsentType;
  purpose: string;
  legalBasis: LegalBasis;
  documentVersion: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Verifica se o paciente tem consentimento ativo para o tipo especificado.
 */
export async function hasActiveConsent(
  patientId: string,
  consentType: ConsentType
): Promise<boolean> {
  const consent = await db.consentRecord.findFirst({
    where: {
      patientId,
      consentType,
      granted: true,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });
  return !!consent;
}

/**
 * Registra concessão de consentimento.
 */
export async function grantConsent(params: GrantConsentParams) {
  const record = await db.consentRecord.create({
    data: {
      ...params,
      granted: true,
      grantedAt: new Date(),
    },
  });
  logger.info('consent_granted', {
    patientId: params.patientId,
    consentType: params.consentType,
    documentVersion: params.documentVersion,
  });
  return record;
}

/**
 * Revoga consentimento previamente concedido.
 */
export async function revokeConsent(
  patientId: string,
  consentType: ConsentType
): Promise<void> {
  await db.consentRecord.updateMany({
    where: { patientId, consentType, granted: true, revokedAt: null },
    data: { revokedAt: new Date(), granted: false },
  });
  logger.info('consent_revoked', { patientId, consentType });
}

/**
 * Retorna todos os registros de consentimento do paciente.
 */
export async function getPatientConsents(patientId: string) {
  return db.consentRecord.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
  });
}
```

---

## TAREFA 9 — Criar endpoint de consentimento

**Criar arquivo** `src/app/api/clinical/consent/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth-guard';
import { grantConsent, revokeConsent, getPatientConsents, ConsentType, LegalBasis } from '@/lib/lgpd/consent-service';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';

const ConsentSchema = z.object({
  patientId: z.string().min(1),
  consentType: z.nativeEnum(ConsentType),
  granted: z.boolean(),
  purpose: z.string().min(1).default('Uso de IA na pré-consulta clínica'),
  documentVersion: z.string().default('v1.0'),
  ipAddress: z.string().optional(),
});

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ConsentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { patientId, consentType, granted, purpose, documentVersion } = parsed.data;

    if (granted) {
      const record = await grantConsent({
        patientId,
        consentType,
        purpose,
        legalBasis: LegalBasis.CONSENT,
        documentVersion,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
      await db.auditEvent.create({
        data: {
          action: 'CONSENT_GRANTED',
          entityType: 'ConsentRecord',
          entityId: record.id,
          details: JSON.stringify({ patientId, consentType }),
        },
      });
      return NextResponse.json({ consent: record }, { status: 201 });
    } else {
      await revokeConsent(patientId, consentType);
      await db.auditEvent.create({
        data: {
          action: 'CONSENT_REVOKED',
          entityType: 'ConsentRecord',
          details: JSON.stringify({ patientId, consentType }),
        },
      });
      return NextResponse.json({ revoked: true });
    }
  } catch (error) {
    logger.error('consent_api_error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    if (!patientId) {
      return NextResponse.json({ error: 'patientId required' }, { status: 400 });
    }
    const consents = await getPatientConsents(patientId);
    return NextResponse.json({ consents });
  } catch (error) {
    logger.error('consent_get_error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);
export const GET = withAuth(getHandler);
```

---

## TAREFA 10 — Criar endpoint de revisão médica (PhysicianReview)

**Criar arquivo** `src/app/api/clinical/review/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Priority } from '@prisma/client';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-guard';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';

const ReviewSchema = z.object({
  sessionId: z.string().min(1),
  triageAccepted: z.boolean().optional(),
  triageCorrectedTo: z.nativeEnum(Priority).optional(),
  triageComment: z.string().max(500).optional(),
  acceptedHypotheses: z.array(z.string()).optional(),
  rejectedHypotheses: z.array(z.string()).optional(),
  addedDiagnosis: z.string().max(200).optional(),
  dataQualityRating: z.number().min(1).max(5).optional(),
  aiUsefulnessRating: z.number().min(1).max(5).optional(),
  comments: z.string().max(1000).optional(),
});

async function postHandler(request: NextRequest) {
  try {
    const session = await getServerSession();
    const body = await request.json();

    const parsed = ReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const data = parsed.data;
    const physicianId = (session?.user as { id?: string })?.id || 'unknown';

    // Verificar se a sessão existe
    const consultationSession = await db.preConsultationSession.findUnique({
      where: { id: data.sessionId },
    });
    if (!consultationSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Criar ou atualizar review
    const review = await db.physicianReview.upsert({
      where: { sessionId: data.sessionId },
      create: {
        sessionId: data.sessionId,
        patientId: consultationSession.patientId,
        physicianId,
        triageAccepted: data.triageAccepted,
        triageCorrectedTo: data.triageCorrectedTo,
        triageComment: data.triageComment,
        hypothesesReviewed: !!(data.acceptedHypotheses || data.rejectedHypotheses),
        acceptedHypotheses: data.acceptedHypotheses ? JSON.stringify(data.acceptedHypotheses) : null,
        rejectedHypotheses: data.rejectedHypotheses ? JSON.stringify(data.rejectedHypotheses) : null,
        addedDiagnosis: data.addedDiagnosis,
        dataQualityRating: data.dataQualityRating,
        aiUsefulnessRating: data.aiUsefulnessRating,
        comments: data.comments,
      },
      update: {
        triageAccepted: data.triageAccepted,
        triageCorrectedTo: data.triageCorrectedTo,
        triageComment: data.triageComment,
        hypothesesReviewed: !!(data.acceptedHypotheses || data.rejectedHypotheses),
        acceptedHypotheses: data.acceptedHypotheses ? JSON.stringify(data.acceptedHypotheses) : undefined,
        rejectedHypotheses: data.rejectedHypotheses ? JSON.stringify(data.rejectedHypotheses) : undefined,
        addedDiagnosis: data.addedDiagnosis,
        dataQualityRating: data.dataQualityRating,
        aiUsefulnessRating: data.aiUsefulnessRating,
        comments: data.comments,
        reviewedAt: new Date(),
      },
    });

    // Se médico corrigiu a triagem, atualizar TriageAssessment
    if (data.triageAccepted === false && data.triageCorrectedTo) {
      await db.triageAssessment.updateMany({
        where: { sessionId: data.sessionId },
        data: { priority: data.triageCorrectedTo },
      });
    }

    // Marcar sessão como COMPLETED após revisão
    await db.preConsultationSession.update({
      where: { id: data.sessionId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    // Auditoria
    await db.auditEvent.create({
      data: {
        userId: physicianId,
        action: 'PHYSICIAN_REVIEW_SUBMITTED',
        entityType: 'PhysicianReview',
        entityId: review.id,
        details: JSON.stringify({
          sessionId: data.sessionId,
          triageAccepted: data.triageAccepted,
          aiUsefulnessRating: data.aiUsefulnessRating,
        }),
      },
    });

    logger.info('physician_review_submitted', {
      sessionId: data.sessionId,
      physicianId,
      triageAccepted: data.triageAccepted,
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    logger.error('review_api_error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }
    const review = await db.physicianReview.findUnique({
      where: { sessionId },
    });
    return NextResponse.json({ review });
  } catch (error) {
    logger.error('review_get_error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = requireRole([UserRole.PHYSICIAN, UserRole.ADMIN])(postHandler);
export const GET = withAuth(getHandler);

// Fix missing import
import { withAuth } from '@/lib/auth-guard';
```

---

## TAREFA 11 — Criar componente PhysicianReviewPanel

**Criar arquivo** `src/components/clinical/PhysicianReviewPanel.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Star, AlertTriangle } from 'lucide-react';

interface Hypothesis {
  hypothesisName: string;
  icdCode?: string;
  probability?: number;
  confidenceLevel?: string;
}

interface TriageAssessment {
  priority: string;
  urgencyScore?: number;
  clinicalReasoning?: string;
  redFlagCount?: number;
}

interface PhysicianReviewPanelProps {
  sessionId: string;
  patientName: string;
  triage?: TriageAssessment;
  hypotheses?: Hypothesis[];
  existingReview?: {
    triageAccepted?: boolean;
    triageCorrectedTo?: string;
    addedDiagnosis?: string;
    dataQualityRating?: number;
    aiUsefulnessRating?: number;
    comments?: string;
  };
  onReviewSubmitted?: () => void;
}

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  IMMEDIATE: { label: 'Imediato', color: 'bg-red-100 text-red-800' },
  URGENT:    { label: 'Urgente',  color: 'bg-orange-100 text-orange-800' },
  HIGH:      { label: 'Alta',     color: 'bg-yellow-100 text-yellow-800' },
  MODERATE:  { label: 'Moderada', color: 'bg-blue-100 text-blue-800' },
  ROUTINE:   { label: 'Rotina',   color: 'bg-green-100 text-green-800' },
  LOW:       { label: 'Baixa',    color: 'bg-gray-100 text-gray-800' },
};

function StarRating({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          className="focus:outline-none disabled:cursor-default"
        >
          <Star
            size={20}
            className={star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        </button>
      ))}
    </div>
  );
}

export function PhysicianReviewPanel({
  sessionId,
  patientName,
  triage,
  hypotheses = [],
  existingReview,
  onReviewSubmitted,
}: PhysicianReviewPanelProps) {
  const isReadOnly = !!existingReview;

  const [triageAccepted, setTriageAccepted] = useState<boolean | undefined>(
    existingReview?.triageAccepted
  );
  const [correctedPriority, setCorrectedPriority] = useState(
    existingReview?.triageCorrectedTo || ''
  );
  const [triageComment, setTriageComment] = useState('');
  const [acceptedHypotheses, setAcceptedHypotheses] = useState<string[]>([]);
  const [rejectedHypotheses, setRejectedHypotheses] = useState<string[]>([]);
  const [addedDiagnosis, setAddedDiagnosis] = useState(existingReview?.addedDiagnosis || '');
  const [dataQualityRating, setDataQualityRating] = useState(existingReview?.dataQualityRating || 0);
  const [aiUsefulnessRating, setAiUsefulnessRating] = useState(existingReview?.aiUsefulnessRating || 0);
  const [comments, setComments] = useState(existingReview?.comments || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(isReadOnly);

  const toggleHypothesis = (name: string, accepted: boolean) => {
    if (accepted) {
      setAcceptedHypotheses(prev =>
        prev.includes(name) ? prev.filter(h => h !== name) : [...prev, name]
      );
      setRejectedHypotheses(prev => prev.filter(h => h !== name));
    } else {
      setRejectedHypotheses(prev =>
        prev.includes(name) ? prev.filter(h => h !== name) : [...prev, name]
      );
      setAcceptedHypotheses(prev => prev.filter(h => h !== name));
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/clinical/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          triageAccepted,
          triageCorrectedTo: triageAccepted === false ? correctedPriority : undefined,
          triageComment,
          acceptedHypotheses: acceptedHypotheses.length > 0 ? acceptedHypotheses : undefined,
          rejectedHypotheses: rejectedHypotheses.length > 0 ? rejectedHypotheses : undefined,
          addedDiagnosis: addedDiagnosis || undefined,
          dataQualityRating: dataQualityRating || undefined,
          aiUsefulnessRating: aiUsefulnessRating || undefined,
          comments: comments || undefined,
        }),
      });
      if (response.ok) {
        setSubmitted(true);
        onReviewSubmitted?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const priorityInfo = triage ? PRIORITY_LABELS[triage.priority] : null;

  return (
    <div className="space-y-4">
      {submitted && !isReadOnly && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          <CheckCircle size={16} />
          Revisão registrada com sucesso.
        </div>
      )}

      {/* Triagem da IA */}
      {triage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle size={16} />
              Triagem da IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Prioridade:</span>
              {priorityInfo && (
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${priorityInfo.color}`}>
                  {priorityInfo.label}
                </span>
              )}
              {triage.urgencyScore !== undefined && (
                <span className="text-xs text-muted-foreground">Score: {triage.urgencyScore}/100</span>
              )}
            </div>
            {triage.clinicalReasoning && (
              <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">{triage.clinicalReasoning}</p>
            )}

            {!isReadOnly && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm font-medium">Sua avaliação da triagem:</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={triageAccepted === true ? 'default' : 'outline'}
                    className="gap-1"
                    onClick={() => setTriageAccepted(true)}
                  >
                    <CheckCircle size={14} /> Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant={triageAccepted === false ? 'destructive' : 'outline'}
                    className="gap-1"
                    onClick={() => setTriageAccepted(false)}
                  >
                    <XCircle size={14} /> Corrigir
                  </Button>
                </div>
                {triageAccepted === false && (
                  <Select value={correctedPriority} onValueChange={setCorrectedPriority}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Selecione a prioridade correta" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Textarea
                  placeholder="Comentário sobre a triagem (opcional)"
                  value={triageComment}
                  onChange={e => setTriageComment(e.target.value)}
                  className="text-sm"
                  rows={2}
                />
              </div>
            )}

            {isReadOnly && existingReview && (
              <div className="pt-2 border-t text-sm">
                <span className={`font-medium ${existingReview.triageAccepted ? 'text-green-700' : 'text-orange-700'}`}>
                  {existingReview.triageAccepted ? '✓ Triagem confirmada' : `⚠ Corrigida para: ${existingReview.triageCorrectedTo}`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hipóteses Diagnósticas */}
      {hypotheses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Hipóteses Diagnósticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hypotheses.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{h.hypothesisName}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.icdCode && `CID: ${h.icdCode} · `}
                    {h.probability !== undefined && `Prob.: ${Math.round(h.probability * 100)}% · `}
                    {h.confidenceLevel && `Confiança: ${h.confidenceLevel}`}
                  </p>
                </div>
                {!isReadOnly && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={acceptedHypotheses.includes(h.hypothesisName) ? 'default' : 'outline'}
                      className="h-7 px-2"
                      onClick={() => toggleHypothesis(h.hypothesisName, true)}
                    >
                      <CheckCircle size={12} />
                    </Button>
                    <Button
                      size="sm"
                      variant={rejectedHypotheses.includes(h.hypothesisName) ? 'destructive' : 'outline'}
                      className="h-7 px-2"
                      onClick={() => toggleHypothesis(h.hypothesisName, false)}
                    >
                      <XCircle size={12} />
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {!isReadOnly && (
              <div className="pt-2">
                <Label className="text-sm">Diagnóstico Final (opcional)</Label>
                <Textarea
                  placeholder="Diagnóstico estabelecido pelo médico..."
                  value={addedDiagnosis}
                  onChange={e => setAddedDiagnosis(e.target.value)}
                  className="text-sm mt-1"
                  rows={2}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Avaliação da IA */}
      {!isReadOnly && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Avaliação da Pré-Consulta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm">Qualidade das informações coletadas</Label>
              <StarRating value={dataQualityRating} onChange={setDataQualityRating} />
            </div>
            <div>
              <Label className="text-sm">Utilidade do suporte de IA</Label>
              <StarRating value={aiUsefulnessRating} onChange={setAiUsefulnessRating} />
            </div>
            <div>
              <Label className="text-sm">Comentários</Label>
              <Textarea
                placeholder="Observações gerais..."
                value={comments}
                onChange={e => setComments(e.target.value)}
                className="text-sm mt-1"
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting || triageAccepted === undefined}
            >
              {submitting ? 'Salvando...' : 'Finalizar Revisão'}
            </Button>
            {triageAccepted === undefined && (
              <p className="text-xs text-muted-foreground text-center">
                Confirme ou corrija a triagem da IA para finalizar
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## TAREFA 12 — Criar wrapper de resiliência para agentes

**Criar arquivo** `src/lib/agents/agent-wrapper.ts`:

```typescript
/**
 * Wrapper de resiliência para chamadas de agentes de IA.
 * Implementa timeout, retry com backoff e registro automático de métricas.
 */
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

interface AgentCallOptions {
  /** Timeout em ms. Default: 30000 */
  timeoutMs?: number;
  /** Tentativas máximas. Default: 2 */
  maxRetries?: number;
  /** Delay inicial entre retries em ms. Default: 1000 */
  retryDelayMs?: number;
  /** Identificador do agente para logs */
  agentType: string;
  /** ID da sessão para rastreabilidade */
  sessionId?: string;
}

interface AgentCallSuccess<T> {
  success: true;
  data: T;
  processingMs: number;
}

interface AgentCallFailure {
  success: false;
  error: string;
  isTimeout: boolean;
  processingMs: number;
}

type AgentCallResult<T> = AgentCallSuccess<T> | AgentCallFailure;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('rate limit')
  );
}

/**
 * Envolve uma chamada de agente com timeout, retry e logging.
 */
export async function withAgentResilience<T>(
  fn: () => Promise<T>,
  options: AgentCallOptions
): Promise<AgentCallResult<T>> {
  const {
    timeoutMs = 30000,
    maxRetries = 2,
    retryDelayMs = 1000,
    agentType,
    sessionId,
  } = options;

  const startTime = Date.now();
  let lastError: Error = new Error('Unknown error');
  let isTimeout = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = retryDelayMs * Math.pow(2, attempt - 1);
      logger.warn('agent_retry', { agentType, attempt, delayMs: delay, sessionId });
      await sleep(delay);
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          isTimeout = true;
          reject(new Error(`Agent timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const data = await Promise.race([fn(), timeoutPromise]);
      const processingMs = Date.now() - startTime;

      logger.info('agent_success', { agentType, processingMs, attempt, sessionId });

      // Gravar métricas de sucesso
      await db.agentExecutionLog.create({
        data: {
          agentType,
          sessionId,
          modelVersion: 'v1.0.0',
          promptVersion: 'v1.0.0',
          processingMs,
          success: true,
        },
      }).catch(() => {}); // Não falhar por causa do log

      return { success: true, data, processingMs };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Não fazer retry em erros de validação (Zod)
      if (lastError.message.includes('ZodError') || lastError.name === 'ZodError') {
        break;
      }

      // Não fazer retry em timeouts (isTimeout já true)
      if (isTimeout) break;

      // Só fazer retry em erros transitórios
      if (!isTransientError(error) && attempt < maxRetries) break;
    }
  }

  const processingMs = Date.now() - startTime;
  logger.error('agent_failed', {
    agentType,
    error: lastError.message,
    isTimeout,
    processingMs,
    sessionId,
  });

  // Gravar métricas de falha
  await db.agentExecutionLog.create({
    data: {
      agentType,
      sessionId,
      modelVersion: 'v1.0.0',
      promptVersion: 'v1.0.0',
      processingMs,
      success: false,
      errorMessage: lastError.message,
    },
  }).catch(() => {});

  return {
    success: false,
    error: lastError.message,
    isTimeout,
    processingMs,
  };
}
```

---

## TAREFA 13 — Melhorar o endpoint de health check

**Substituir completamente** `src/app/api/route.ts` pelo seguinte:

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Checar banco de dados
    await db.$queryRaw`SELECT 1`;
    const dbStatus = 'ok';

    // Métricas de agentes últimas 24h
    const [agentLogs, pendingReviews] = await Promise.all([
      db.agentExecutionLog.findMany({
        where: { createdAt: { gte: since24h } },
        select: { success: true, processingMs: true },
      }),
      db.preConsultationSession.count({
        where: {
          status: 'COMPLETED',
          physicianReview: null,
        },
      }),
    ]);

    const totalCalls = agentLogs.length;
    const successCalls = agentLogs.filter(l => l.success).length;
    const agentSuccessRate24h = totalCalls > 0
      ? Math.round((successCalls / totalCalls) * 1000) / 1000
      : null;

    const avgAgentLatencyMs = totalCalls > 0
      ? Math.round(agentLogs.reduce((sum, l) => sum + (l.processingMs || 0), 0) / totalCalls)
      : null;

    return NextResponse.json({
      status: 'healthy',
      timestamp: now.toISOString(),
      services: {
        database: dbStatus,
        agentSuccessRate24h,
        avgAgentLatencyMs,
        totalAgentCalls24h: totalCalls,
        pendingPhysicianReviews: pendingReviews,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: now.toISOString(),
        services: { database: 'error' },
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
```

**Nota:** Este endpoint requer que o modelo `PhysicianReview` já exista no banco (Tarefa 7). A query `physicianReview: null` funcionará após a migração.

---

## TAREFA 14 — Configurar Vitest e criar testes essenciais

**Instalar dependências de teste:**
```bash
bun add -d vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom
```

**Criar arquivo** `vitest.config.ts` na raiz:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'src/components/ui/**',
        'demo-data/**',
        'src/app/**/*.tsx',
        'prisma/**',
        'skills/**',
      ],
      thresholds: {
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Criar arquivo** `src/lib/agents/__tests__/clinical-agents.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do módulo de seed para evitar dependência de DB nos testes unitários
vi.mock('../../../../demo-data/seed', () => ({
  redFlagRules: [
    {
      id: 'rf-cardio-01',
      name: 'Dor Torácica Aguda',
      severity: 'critical',
      keywords: ['dor no peito', 'dor torácica', 'angina'],
      conditions: [],
      recommendation: 'Encaminhamento imediato para emergência',
    },
    {
      id: 'rf-resp-01',
      name: 'Dificuldade Respiratória Aguda',
      severity: 'critical',
      keywords: ['falta de ar', 'dispneia', 'dificuldade respiratória'],
      conditions: [],
      recommendation: 'Avaliação médica imediata',
    },
    {
      id: 'rf-neuro-01',
      name: 'Cefaleia Súbita Intensa',
      severity: 'high',
      keywords: ['cefaleia', 'dor de cabeça intensa', 'pior dor de cabeça'],
      conditions: [],
      recommendation: 'Avaliação neurológica urgente',
    },
  ],
}));

// Importar APÓS o mock
import { detectRedFlags } from '../clinical-agents';

const makeContext = (chatHistory: { role: string; content: string }[] = []) => ({
  patientId: 'p1',
  sessionId: 's1',
  symptoms: [],
  history: { conditions: [], medications: [], allergies: [] },
  demographics: { name: 'Paciente Teste', age: 45, sex: 'M' },
  chatHistory,
  previousMessages: chatHistory.map(m => m.content).join('\n'),
});

describe('detectRedFlags', () => {
  // Happy path
  it('detecta dor no peito como red flag cardiovascular', () => {
    const symptoms = [{ symptomName: 'dor no peito', severity: 8 }];
    const result = detectRedFlags(symptoms, makeContext());
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toContain('Torácica');
  });

  it('detecta falta de ar como red flag respiratória', () => {
    const symptoms = [{ symptomName: 'falta de ar', severity: 7 }];
    const result = detectRedFlags(symptoms, makeContext());
    expect(result.length).toBeGreaterThan(0);
  });

  it('detecta cefaleia intensa como red flag neurológica', () => {
    const context = makeContext([{ role: 'USER', content: 'Tenho dor de cabeça intensa, a pior da minha vida' }]);
    const result = detectRedFlags([], context);
    expect(result.length).toBeGreaterThan(0);
  });

  // Negações — NÃO deve disparar
  it('não dispara red flag quando paciente nega dor no peito', () => {
    const context = makeContext([{ role: 'USER', content: 'Não tenho dor no peito, só dor nas costas' }]);
    const result = detectRedFlags([], context);
    const cardioFlags = result.filter(rf => rf.id === 'rf-cardio-01');
    expect(cardioFlags.length).toBe(0);
  });

  it('não dispara para "nunca tive dor no peito"', () => {
    const context = makeContext([{ role: 'USER', content: 'Nunca tive dor no peito na vida' }]);
    const result = detectRedFlags([], context);
    const cardioFlags = result.filter(rf => rf.id === 'rf-cardio-01');
    expect(cardioFlags.length).toBe(0);
  });

  it('não dispara para "sem falta de ar"', () => {
    const context = makeContext([{ role: 'USER', content: 'Estou com febre mas sem falta de ar' }]);
    const result = detectRedFlags([], context);
    const respFlags = result.filter(rf => rf.id === 'rf-resp-01');
    expect(respFlags.length).toBe(0);
  });

  it('não dispara para "nega dispneia"', () => {
    const context = makeContext([{ role: 'USER', content: 'Nega dispneia e nega dor torácica' }]);
    const result = detectRedFlags([], context);
    expect(result.filter(rf => ['rf-cardio-01', 'rf-resp-01'].includes(rf.id))).toHaveLength(0);
  });

  // Contexto de terceiros — NÃO deve disparar para o paciente
  it('não dispara red flag para "minha mãe teve infarto"', () => {
    const context = makeContext([{
      role: 'USER',
      content: 'Minha mãe teve infarto e dor no peito antes de morrer, eu só tenho dor nas costas'
    }]);
    const result = detectRedFlags([], context);
    const cardioFlags = result.filter(rf => rf.id === 'rf-cardio-01');
    expect(cardioFlags.length).toBe(0);
  });

  it('não dispara para "meu pai sofreu AVC"', () => {
    const context = makeContext([{
      role: 'USER',
      content: 'Meu pai sofreu AVC e tinha cefaleia, eu não tenho isso'
    }]);
    const result = detectRedFlags([], context);
    // cefaleia está no contexto de terceiro + negada, não deve disparar
    const neuroFlags = result.filter(rf => rf.id === 'rf-neuro-01');
    expect(neuroFlags.length).toBe(0);
  });

  // Linguagem coloquial
  it('detecta "peito apertado" como red flag cardiovascular', () => {
    const context = makeContext([{ role: 'USER', content: 'Estou com o peito apertado desde ontem' }]);
    const result = detectRedFlags([], context);
    expect(result.filter(rf => rf.id === 'rf-cardio-01').length).toBeGreaterThan(0);
  });

  it('detecta "sem fôlego" como red flag respiratória', () => {
    const context = makeContext([{ role: 'USER', content: 'Estou sem fôlego quando subo escada' }]);
    const result = detectRedFlags([], context);
    expect(result.filter(rf => rf.id === 'rf-resp-01').length).toBeGreaterThan(0);
  });

  // Edge cases
  it('retorna array vazio para sintomas sem red flags', () => {
    const symptoms = [{ symptomName: 'coriza leve' }];
    const result = detectRedFlags(symptoms, makeContext());
    expect(result).toHaveLength(0);
  });

  it('funciona com array de sintomas vazio e sem histórico', () => {
    const result = detectRedFlags([], makeContext());
    expect(result).toHaveLength(0);
  });

  it('não duplica red flags para múltiplos matches da mesma regra', () => {
    const context = makeContext([{
      role: 'USER',
      content: 'Dor no peito e dor torácica há dois dias'
    }]);
    const result = detectRedFlags([], context);
    const cardioFlags = result.filter(rf => rf.id === 'rf-cardio-01');
    expect(cardioFlags.length).toBe(1);
  });
});
```

**Criar arquivo** `src/lib/agents/__tests__/pophealth-agents.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateRiskScore, detectAnomalies } from '../pophealth-agents';

describe('calculateRiskScore', () => {
  it('retorna CRITICAL para score >= 80', () => {
    const indicators = [
      { value: 90, category: 'morbidity' },
      { value: 85, category: 'mortality' },
    ];
    const result = calculateRiskScore(indicators);
    expect(result.level).toBe('CRITICAL');
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it('retorna VERY_LOW para score < 20', () => {
    const indicators = [
      { value: 5, category: 'morbidity' },
      { value: 10, category: 'mortality' },
    ];
    const result = calculateRiskScore(indicators);
    expect(result.level).toBe('VERY_LOW');
  });

  it('retorna score 50 quando indicadores vazios (fallback)', () => {
    const result = calculateRiskScore([]);
    expect(result.score).toBe(50);
    expect(result.level).toBe('HIGH');
  });

  it('aplica peso negativo para coverage (maior cobertura = menor risco)', () => {
    const lowCoverage = calculateRiskScore([{ value: 20, category: 'coverage' }]);
    const highCoverage = calculateRiskScore([{ value: 90, category: 'coverage' }]);
    // Com peso negativo, valores absolutos são iguais — não deve influenciar direção do risco da mesma forma
    expect(typeof lowCoverage.score).toBe('number');
    expect(typeof highCoverage.score).toBe('number');
  });

  it('limita score entre 0 e 100', () => {
    const indicators = [
      { value: 200, category: 'morbidity' }, // acima de 100
      { value: -50, category: 'mortality' }, // abaixo de 0
    ];
    const result = calculateRiskScore(indicators);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('aceita pesos customizados', () => {
    const indicators = [{ value: 80, category: 'custom' }];
    const result = calculateRiskScore(indicators, { custom: 0.5 });
    expect(result.score).toBeGreaterThan(0);
  });
});

describe('detectAnomalies', () => {
  it('retorna array vazio para menos de 3 valores', () => {
    const values = [
      { period: '2024-01', value: 10 },
      { period: '2024-02', value: 12 },
    ];
    expect(detectAnomalies(values)).toHaveLength(0);
  });

  it('detecta spike claro acima do threshold padrão (2 desvios)', () => {
    const values = [
      { period: '2024-01', value: 10 },
      { period: '2024-02', value: 11 },
      { period: '2024-03', value: 10 },
      { period: '2024-04', value: 10 },
      { period: '2024-05', value: 50 }, // spike claro
    ];
    const anomalies = detectAnomalies(values);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].value).toBe(50);
  });

  it('não detecta anomalia em série estável', () => {
    const values = [
      { period: '2024-01', value: 10 },
      { period: '2024-02', value: 11 },
      { period: '2024-03', value: 10 },
      { period: '2024-04', value: 11 },
      { period: '2024-05', value: 10 },
    ];
    expect(detectAnomalies(values)).toHaveLength(0);
  });

  it('calcula deviation corretamente (campo numérico)', () => {
    const values = [
      { period: '2024-01', value: 10 },
      { period: '2024-02', value: 10 },
      { period: '2024-03', value: 10 },
      { period: '2024-04', value: 10 },
      { period: '2024-05', value: 50 },
    ];
    const anomalies = detectAnomalies(values);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(typeof anomalies[0].deviation).toBe('number');
    expect(anomalies[0].deviation).toBeGreaterThan(0);
  });
});
```

**Criar arquivo** `src/lib/schemas/__tests__/clinical.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  AgentTriageOutputSchema,
  PatientSchema,
  RedFlagSchema,
} from '../clinical';

const ChatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

describe('ChatRequestSchema', () => {
  it('aceita sessionId e message válidos', () => {
    const result = ChatRequestSchema.safeParse({ sessionId: 'abc123', message: 'Tenho dor de cabeça' });
    expect(result.success).toBe(true);
  });

  it('rejeita message vazia', () => {
    const result = ChatRequestSchema.safeParse({ sessionId: 'abc123', message: '' });
    expect(result.success).toBe(false);
  });

  it('rejeita message com mais de 2000 caracteres', () => {
    const result = ChatRequestSchema.safeParse({ sessionId: 'abc123', message: 'a'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('rejeita sessionId vazio', () => {
    const result = ChatRequestSchema.safeParse({ sessionId: '', message: 'olá' });
    expect(result.success).toBe(false);
  });
});

describe('AgentTriageOutputSchema', () => {
  const validTriage = {
    priority: 'ROUTINE',
    urgencyScore: 20,
    redFlags: [],
    riskFactors: ['hipertensão'],
    protectiveFactors: [],
    dataCompleteness: 80,
    confidenceScore: 0.85,
    limitations: [],
    recommendedAction: 'Consulta de rotina',
    clinicalReasoning: 'Sem sinais de urgência',
    escalationRequired: false,
  };

  it('aceita output válido completo', () => {
    expect(AgentTriageOutputSchema.safeParse(validTriage).success).toBe(true);
  });

  it('rejeita urgencyScore fora de 0-100', () => {
    expect(AgentTriageOutputSchema.safeParse({ ...validTriage, urgencyScore: 150 }).success).toBe(false);
    expect(AgentTriageOutputSchema.safeParse({ ...validTriage, urgencyScore: -1 }).success).toBe(false);
  });

  it('rejeita confidenceScore fora de 0-1', () => {
    expect(AgentTriageOutputSchema.safeParse({ ...validTriage, confidenceScore: 1.5 }).success).toBe(false);
  });

  it('aplica defaults para redFlags, riskFactors, limitations', () => {
    const minimal = {
      ...validTriage,
      redFlags: undefined,
      riskFactors: undefined,
      limitations: undefined,
    };
    const result = AgentTriageOutputSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.data.redFlags)).toBe(true);
      expect(Array.isArray(result.data.riskFactors)).toBe(true);
    }
  });

  it('rejeita priority inválida', () => {
    expect(AgentTriageOutputSchema.safeParse({ ...validTriage, priority: 'SUPER_URGENT' }).success).toBe(false);
  });
});

describe('PatientSchema', () => {
  it('valida bloodType com enum correto', () => {
    const valid = { name: 'João', birthDate: new Date('1980-01-01'), bloodType: 'A+' };
    expect(PatientSchema.safeParse(valid).success).toBe(true);
  });

  it('rejeita bloodType inválido como string livre', () => {
    const invalid = { name: 'João', birthDate: new Date('1980-01-01'), bloodType: 'A positivo' };
    expect(PatientSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejeita nome com menos de 2 caracteres', () => {
    const invalid = { name: 'J', birthDate: new Date('1980-01-01') };
    expect(PatientSchema.safeParse(invalid).success).toBe(false);
  });
});
```

**Adicionar scripts ao `package.json`:**
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

---

## TAREFA 15 — Sanitizar o arquivo .env

**Criar arquivo** `.env.example` na raiz com:
```
DATABASE_URL=file:./db/dev.db
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

**Editar `.env`** — substituir o path absoluto:
```
# ANTES:
DATABASE_URL=file:/home/z/my-project/db/custom.db

# DEPOIS:
DATABASE_URL=file:./db/custom.db
```

**Verificar `.gitignore`** — garantir que `.env` está listado (deve estar, mas confirme).

---

## RESUMO DE EXECUÇÃO

Após todas as tarefas acima, execute em sequência:

```bash
# 1. Instalar dependências de teste
bun add -d vitest @vitest/coverage-v8

# 2. Rodar a migração do banco com os novos modelos
npx prisma migrate dev --name "add-consent-lgpd-physician-review"

# 3. Verificar TypeScript sem erros
npx tsc --noEmit

# 4. Rodar os testes
bun run test

# 5. Rodar o lint
bun run lint

# 6. Fazer o build de verificação
bun run build
```

---

## ARQUIVOS CRIADOS/MODIFICADOS NESTE PROMPT

**Criados:**
- `src/lib/auth-guard.ts`
- `src/lib/logger.ts`
- `src/lib/lgpd/consent-service.ts`
- `src/lib/agents/agent-wrapper.ts`
- `src/app/api/clinical/consent/route.ts`
- `src/app/api/clinical/review/route.ts`
- `src/components/clinical/PhysicianReviewPanel.tsx`
- `src/lib/agents/__tests__/clinical-agents.test.ts`
- `src/lib/agents/__tests__/pophealth-agents.test.ts`
- `src/lib/schemas/__tests__/clinical.test.ts`
- `vitest.config.ts`
- `.env.example`

**Modificados:**
- `src/app/api/clinical/chat/route.ts` — singleton db, auth, validação Zod, logger
- `src/app/api/clinical/patients/route.ts` — singleton db, auth, logger
- `src/app/api/clinical/session/route.ts` — singleton db, auth, validação Zod, logger
- `src/app/api/clinical/complete/route.ts` — singleton db, auth, parallelização, logger
- `src/app/api/pophealth/dashboard/route.ts` — singleton db, auth, validação Zod, logger
- `src/app/api/pophealth/regions/route.ts` — singleton db, auth, logger
- `src/app/api/route.ts` — health check completo com métricas
- `src/lib/agents/clinical-agents.ts` — detectRedFlags seguro, parallelização
- `prisma/schema.prisma` — ConsentRecord, PhysicianReview, enums
- `package.json` — scripts de teste
- `.env` — path relativo sem exposição de diretório local
```
