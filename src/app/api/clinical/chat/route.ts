// ============================================================
// CLINICAL API - Chat Endpoint with AI Agent Integration
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Priority } from '@prisma/client';
import { db } from '@/lib/db';
import { orchestratePreConsultation } from '@/lib/agents/clinical-agents';
import { withAuth } from '@/lib/auth-guard';
import { logger } from '@/lib/logger';
import { hasActiveConsent, ConsentType } from '@/lib/lgpd/consent-service';

// Validation schemas
const ChatRequestSchema = z.object({
  sessionId: z.string().min(1, 'sessionId é obrigatório'),
  message: z.string().min(1, 'Mensagem não pode ser vazia').max(2000, 'Mensagem muito longa'),
});

async function handler(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Validate input
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    
    const { sessionId, message } = parsed.data;

    const session = await db.preConsultationSession.findUnique({
      where: { id: sessionId },
      include: {
        patient: {
          include: {
            conditions: true,
            medications: true,
            allergies: true,
            vitalSigns: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
        },
        symptomReports: true,
        chatMessages: { orderBy: { createdAt: 'asc' }, take: 20 },
        triageAssessment: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // LGPD — verificar consentimento ativo antes de processar com IA
    const consentOk = await hasActiveConsent(
      session.patientId,
      ConsentType.PRE_CONSULTATION_AI
    );
    if (!consentOk) {
      logger.warn('chat_consent_missing', {
        patientId: session.patientId,
        sessionId,
      });
      return NextResponse.json(
        {
          error: 'CONSENT_REQUIRED',
          message: 'Consentimento para uso de IA na pré-consulta não foi registrado para este paciente.',
          consentType: ConsentType.PRE_CONSULTATION_AI,
          action: 'Registre o consentimento via POST /api/clinical/consent antes de iniciar a pré-consulta.',
        },
        { status: 403 }
      );
    }

    await db.chatMessage.create({
      data: { sessionId, role: 'USER', content: message },
    });

    const birthDate = new Date(session.patient.birthDate);
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    const context = {
      patientId: session.patientId,
      sessionId: session.id,
      symptoms: session.symptomReports.map(s => ({
        symptomName: s.symptomName,
        severity: s.severity || undefined,
        onsetDuration: s.onsetDuration || undefined,
        bodySite: s.bodySite || undefined,
        character: s.character || undefined,
      })),
      history: {
        conditions: session.patient.conditions.map(c => ({
          name: c.conditionName,
          code: c.conditionCode || undefined,
          status: c.status,
        })),
        medications: session.patient.medications.map(m => ({
          name: m.medicationName,
          dosage: m.dosage || undefined,
          frequency: m.frequency || undefined,
        })),
        allergies: session.patient.allergies.map(a => ({
          substance: a.substance,
          reaction: a.reaction || undefined,
          severity: a.severity || undefined,
        })),
      },
      demographics: {
        name: session.patient.name,
        age,
        sex: session.patient.sex || undefined,
      },
      chatHistory: session.chatMessages.map(m => ({ role: m.role, content: m.content })),
      previousMessages: session.chatMessages.map(m => m.content).join('\n'),
    };

    const results = await orchestratePreConsultation(message, context);

    const assistantResponse = results.interviewResponse.data?.nextQuestion || 
      'Desculpe, não consegui processar sua mensagem. Pode repetir?';

    await db.chatMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: assistantResponse,
        confidence: results.interviewResponse.data?.confidence,
      },
    });

    if (results.triageResult?.success && results.triageResult.data) {
      const triageData = results.triageResult.data;
      
      await db.triageAssessment.upsert({
        where: { sessionId },
        create: {
          patientId: session.patientId,
          sessionId,
          priority: triageData.priority as Priority,
          priorityRationale: triageData.clinicalReasoning,
          urgencyScore: triageData.urgencyScore,
          redFlags: JSON.stringify(triageData.redFlags),
          redFlagCount: triageData.redFlags.length,
          riskFactors: JSON.stringify(triageData.riskFactors),
          protectiveFactors: JSON.stringify(triageData.protectiveFactors),
          dataCompleteness: triageData.dataCompleteness,
          confidenceScore: triageData.confidenceScore,
          limitations: JSON.stringify(triageData.limitations),
          recommendedAction: triageData.recommendedAction,
          clinicalReasoning: triageData.clinicalReasoning,
          modelVersion: 'v1.0.0',
        },
        update: {
          priority: triageData.priority as Priority,
          urgencyScore: triageData.urgencyScore,
          redFlags: JSON.stringify(triageData.redFlags),
          redFlagCount: triageData.redFlags.length,
          riskFactors: JSON.stringify(triageData.riskFactors),
          dataCompleteness: triageData.dataCompleteness,
          confidenceScore: triageData.confidenceScore,
          recommendedAction: triageData.recommendedAction,
        },
      });
    }

    if (!session.primaryComplaint && context.symptoms.length > 0) {
      await db.preConsultationSession.update({
        where: { id: sessionId },
        data: { primaryComplaint: context.symptoms[0].symptomName },
      });
    }

    logger.info('chat_success', { sessionId, processingMs: Date.now() - startTime });

    return NextResponse.json({
      success: true,
      response: assistantResponse,
      triage: results.triageResult?.data,
      summary: results.summaryResult?.data,
      hypotheses: results.hypothesisResult?.data,
      sessionComplete: results.interviewResponse.data?.sessionComplete || false,
      confidence: results.interviewResponse.data?.confidence || 0,
      processingMs: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('chat_api_error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      processingMs: Date.now() - startTime,
    }, { status: 500 });
  }
}

export const POST = withAuth(handler);
