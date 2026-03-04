/**
 * Health Check Endpoint
 * Verifica saúde dos serviços e retorna métricas operacionais
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

interface HealthCheckResult {
  name: string;
  status: 'ok' | 'degraded' | 'error';
  latencyMs?: number;
  details?: Record<string, unknown>;
  error?: string;
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return {
      name: 'database',
      status: 'ok',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'error',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkAgentMetrics(since24h: Date): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const agentLogs = await db.agentExecutionLog.findMany({
      where: { createdAt: { gte: since24h } },
      select: { success: true, processingMs: true, agentType: true },
    });

    const totalCalls = agentLogs.length;
    const successCalls = agentLogs.filter(l => l.success).length;
    const successRate = totalCalls > 0 ? successCalls / totalCalls : 1;
    const avgLatency = totalCalls > 0
      ? Math.round(agentLogs.reduce((sum, l) => sum + (l.processingMs || 0), 0) / totalCalls)
      : 0;

    // Agrupar por tipo de agente
    const byType: Record<string, { total: number; success: number }> = {};
    for (const log of agentLogs) {
      if (!byType[log.agentType]) {
        byType[log.agentType] = { total: 0, success: 0 };
      }
      byType[log.agentType].total++;
      if (log.success) byType[log.agentType].success++;
    }

    return {
      name: 'agents',
      status: successRate >= 0.9 ? 'ok' : successRate >= 0.7 ? 'degraded' : 'error',
      latencyMs: Date.now() - start,
      details: {
        totalCalls24h: totalCalls,
        successRate: Math.round(successRate * 1000) / 1000,
        avgLatencyMs: avgLatency,
        byAgentType: byType,
      },
    };
  } catch (error) {
    return {
      name: 'agents',
      status: 'error',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkSessionMetrics(since24h: Date): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const [activeSessions, completedSessions, pendingReviews] = await Promise.all([
      db.preConsultationSession.count({
        where: { status: 'ACTIVE', createdAt: { gte: since24h } },
      }),
      db.preConsultationSession.count({
        where: { status: 'COMPLETED', createdAt: { gte: since24h } },
      }),
      db.preConsultationSession.count({
        where: {
          status: 'COMPLETED',
          physicianReview: null,
        },
      }),
    ]);

    return {
      name: 'sessions',
      status: 'ok',
      latencyMs: Date.now() - start,
      details: {
        active24h: activeSessions,
        completed24h: completedSessions,
        pendingPhysicianReviews: pendingReviews,
      },
    };
  } catch (error) {
    return {
      name: 'sessions',
      status: 'error',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkConsentMetrics(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const [totalConsents, activeConsents] = await Promise.all([
      db.consentRecord.count(),
      db.consentRecord.count({
        where: { granted: true, revokedAt: null },
      }),
    ]);

    return {
      name: 'lgpd_compliance',
      status: 'ok',
      latencyMs: Date.now() - start,
      details: {
        totalConsentRecords: totalConsents,
        activeConsents,
      },
    };
  } catch (error) {
    return {
      name: 'lgpd_compliance',
      status: 'error',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET() {
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const startTotal = Date.now();

  try {
    // Executar todos os checks em paralelo
    const [dbCheck, agentCheck, sessionCheck, consentCheck] = await Promise.all([
      checkDatabase(),
      checkAgentMetrics(since24h),
      checkSessionMetrics(since24h),
      checkConsentMetrics(),
    ]);

    const checks = [dbCheck, agentCheck, sessionCheck, consentCheck];

    // Determinar status geral
    const hasError = checks.some(c => c.status === 'error');
    const hasDegraded = checks.some(c => c.status === 'degraded');
    const overallStatus = hasError ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';

    // Calcular latência total
    const totalLatencyMs = Date.now() - startTotal;

    const response = {
      status: overallStatus,
      timestamp: now.toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime ? Math.round(process.uptime()) : undefined,
      totalLatencyMs,
      checks: checks.reduce((acc, check) => {
        acc[check.name] = {
          status: check.status,
          latencyMs: check.latencyMs,
          ...check.details,
          ...(check.error && { error: check.error }),
        };
        return acc;
      }, {} as Record<string, unknown>),
    };

    // Log apenas se houver problemas
    if (overallStatus !== 'healthy') {
      logger.warn('health_check_issues', { status: overallStatus, checks });
    }

    return NextResponse.json(response, {
      status: overallStatus === 'unhealthy' ? 503 : 200,
    });
  } catch (error) {
    logger.error('health_check_failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: now.toISOString(),
        totalLatencyMs: Date.now() - startTotal,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
