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
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          isTimeout = true;
          reject(new Error(`Agent timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      let data: T;
      try {
        data = await Promise.race([fn(), timeoutPromise]);
      } finally {
        clearTimeout(timeoutHandle); // sempre limpa — sucesso ou erro
      }

      const processingMs = Date.now() - startTime;

      logger.info('agent_success', { agentType, processingMs, attempt, sessionId });

      await db.agentExecutionLog.create({
        data: {
          agentType,
          sessionId,
          modelVersion: 'v1.0.0',
          promptVersion: 'v1.0.0',
          processingMs,
          success: true,
        },
      }).catch(() => {});

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
