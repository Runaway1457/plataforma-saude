// ============================================================
// CLINICAL API - Complete Session and Generate Summary
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SessionStatus, Priority } from '@prisma/client';
import { db } from '@/lib/db';
import { summaryAgent, hypothesisAgent } from '@/lib/agents/clinical-agents';
import { withAuth } from '@/lib/auth-guard';
import { logger } from '@/lib/logger';
import { hasActiveConsent, ConsentType } from '@/lib/lgpd/consent-service';

const CompleteRequestSchema = z.object({
  sessionId: z.string().min(1, 'sessionId é obrigatório'),
});

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    
    const parsed = CompleteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    
    const { sessionId } = parsed.data;

    const session = await db.preConsultationSession.findUnique({
      where: { id: sessionId },
      include: {
        patient: {
          include: {
            conditions: true,
            medications: true,
            allergies: true,
          },
        },
        symptomReports: true,
        chatMessages: { orderBy: { createdAt: 'asc' } },
        triageAssessment: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // LGPD — verificar consentimento antes de processar dados com IA
    const consentOk = await hasActiveConsent(
      session.patientId,
      ConsentType.PRE_CONSULTATION_AI
    );
    if (!consentOk) {
      logger.warn('complete_consent_missing', {
        patientId: session.patientId,
        sessionId,
      });
      return NextResponse.json(
        {
          error: 'CONSENT_REQUIRED',
          message: 'Consentimento para uso de IA não registrado para este paciente.',
          consentType: ConsentType.PRE_CONSULTATION_AI,
        },
        { status: 403 }
      );
    }

    const birthDate = new Date(session.patient.birthDate);
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    const context = {
      patientId: session.patientId,
      sessionId: session.id,
      symptoms: session.symptomReports.map(s => ({
        symptomName: s.symptomName,
        severity: s.severity || undefined,
        onsetDuration: s.onsetDuration || undefined,
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
        })),
        allergies: session.patient.allergies.map(a => ({
          substance: a.substance,
          reaction: a.reaction || undefined,
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

    const triageData = session.triageAssessment ? {
      priority: session.triageAssessment.priority,
      urgencyScore: session.triageAssessment.urgencyScore || 0,
      redFlags: session.triageAssessment.redFlags ? JSON.parse(session.triageAssessment.redFlags) : [],
      riskFactors: session.triageAssessment.riskFactors ? JSON.parse(session.triageAssessment.riskFactors) : [],
      protectiveFactors: [],
      dataCompleteness: session.triageAssessment.dataCompleteness || 50,
      confidenceScore: session.triageAssessment.confidenceScore || 0.5,
      limitations: [],
      recommendedAction: session.triageAssessment.recommendedAction || '',
      clinicalReasoning: session.triageAssessment.clinicalReasoning || '',
      escalationRequired: false,
    } : {
      priority: 'ROUTINE' as const,
      urgencyScore: 0,
      redFlags: [],
      riskFactors: [],
      protectiveFactors: [],
      dataCompleteness: 50,
      confidenceScore: 0.5,
      limitations: [],
      recommendedAction: '',
      clinicalReasoning: '',
      escalationRequired: false,
    };

    // Parallelize agent calls
    const [summaryResult, hypothesisResult] = await Promise.all([
      summaryAgent(context, triageData),
      hypothesisAgent(context, triageData),
    ]);

    const clinicalSummary = await db.clinicalSummary.create({
      data: {
        sessionId,
        patientId: session.patientId,
        chiefComplaint: summaryResult.data?.chiefComplaint || session.primaryComplaint || 'Não especificado',
        historyPresentIllness: summaryResult.data?.historyPresentIllness || '',
        relevantHistory: summaryResult.data?.relevantHistory || '',
        currentMedications: JSON.stringify(summaryResult.data?.currentMedications || []),
        allergiesSummary: summaryResult.data?.allergiesSummary || '',
        riskFactorsSummary: summaryResult.data?.riskFactorsSummary || '',
        dataGaps: JSON.stringify(summaryResult.data?.dataGaps || []),
        inconsistencies: JSON.stringify([]),
        pendingExams: JSON.stringify(summaryResult.data?.pendingExams || []),
        alertFlags: JSON.stringify(summaryResult.data?.alertFlags || []),
        triagePriority: triageData.priority as Priority,
        clinicalNotes: summaryResult.data?.summaryForPhysician || '',
        summaryForPhysician: summaryResult.data?.summaryForPhysician || '',
      },
    });

    if (hypothesisResult.data?.hypotheses) {
      for (const [index, hypothesis] of hypothesisResult.data.hypotheses.entries()) {
        await db.differentialHypothesis.create({
          data: {
            summaryId: clinicalSummary.id,
            hypothesisName: hypothesis.hypothesisName,
            icdCode: hypothesis.icdCode,
            probability: hypothesis.probability,
            confidenceLevel: hypothesis.confidenceLevel,
            supportingEvidence: JSON.stringify(hypothesis.supportingEvidence || []),
            contradictingEvidence: JSON.stringify(hypothesis.contradictingEvidence || []),
            missingData: JSON.stringify(hypothesis.missingData || []),
            suggestedWorkup: JSON.stringify(hypothesis.suggestedWorkup || []),
            urgency: hypothesis.urgency,
            rankOrder: index + 1,
          },
        });
      }
    }

    await db.preConsultationSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.COMPLETED, completedAt: new Date() },
    });

    const fullSummary = await db.clinicalSummary.findUnique({
      where: { id: clinicalSummary.id },
      include: { hypotheses: true },
    });

    logger.info('session_completed', { sessionId, patientId: session.patientId });

    return NextResponse.json({
      success: true,
      summary: fullSummary,
      triage: triageData,
    });
  } catch (error) {
    logger.error('complete_session_error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAuth(handler);
