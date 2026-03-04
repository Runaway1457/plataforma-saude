// ============================================================
// CLINICAL API - Session Management
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SessionStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logger } from '@/lib/logger';

// Validation schemas
const SessionCreateSchema = z.object({
  patientId: z.string().min(1, 'patientId é obrigatório'),
  primaryComplaint: z.string().max(500).optional(),
});

const SessionPatchSchema = z.object({
  sessionId: z.string().min(1),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ESCALATED']),
});

// GET /api/clinical/session - Get or create session
async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      const session = await db.preConsultationSession.findUnique({
        where: { id: sessionId },
        include: {
          patient: {
            include: {
              conditions: true,
              medications: true,
              allergies: true,
              vitalSigns: {
                orderBy: { createdAt: 'desc' },
                take: 10,
              },
            },
          },
          symptomReports: true,
          chatMessages: {
            orderBy: { createdAt: 'asc' },
          },
          triageAssessment: true,
          clinicalSummary: {
            include: { hypotheses: true },
          },
          physicianReview: true,
        },
      });

      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      return NextResponse.json({ session });
    }

    if (!patientId) {
      return NextResponse.json({ error: 'patientId or sessionId required' }, { status: 400 });
    }

    // Get active session or create new one
    let session = await db.preConsultationSession.findFirst({
      where: {
        patientId,
        status: SessionStatus.ACTIVE,
      },
      include: {
        patient: {
          include: {
            conditions: true,
            medications: true,
            allergies: true,
            vitalSigns: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
        symptomReports: true,
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
        triageAssessment: true,
        clinicalSummary: {
          include: { hypotheses: true },
        },
        physicianReview: true,
      },
    });

    if (!session) {
      const patient = await db.patient.findUnique({
        where: { id: patientId },
      });

      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      session = await db.preConsultationSession.create({
        data: {
          patientId,
          userId: patient.userId,
          status: SessionStatus.ACTIVE,
          aiModelVersion: 'v1.0.0',
        },
        include: {
          patient: {
            include: {
              conditions: true,
              medications: true,
              allergies: true,
              vitalSigns: {
                orderBy: { createdAt: 'desc' },
                take: 10,
              },
            },
          },
          symptomReports: true,
          chatMessages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      await db.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'ASSISTANT',
          content: `Olá! Sou o assistente de pré-consulta. Vou fazer algumas perguntas para preparar sua consulta médica. Qual é o principal motivo da sua consulta hoje?`,
        },
      });
      
      logger.info('session_created', { sessionId: session.id, patientId });
    }

    return NextResponse.json({ session });
  } catch (error) {
    logger.error('session_api_error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/clinical/session - Create new session
async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    
    const parsed = SessionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    
    const { patientId, primaryComplaint } = parsed.data;

    const patient = await db.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const session = await db.preConsultationSession.create({
      data: {
        patientId,
        userId: patient.userId,
        status: SessionStatus.ACTIVE,
        primaryComplaint,
        aiModelVersion: 'v1.0.0',
      },
      include: {
        patient: {
          include: {
            conditions: true,
            medications: true,
            allergies: true,
          },
        },
      },
    });

    await db.auditEvent.create({
      data: {
        action: 'CREATE_SESSION',
        entityType: 'PreConsultationSession',
        entityId: session.id,
        details: JSON.stringify({ patientId }),
      },
    });

    logger.info('session_created', { sessionId: session.id, patientId });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    logger.error('session_creation_error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/clinical/session - Update session status
async function patchHandler(request: NextRequest) {
  try {
    const body = await request.json();
    
    const parsed = SessionPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    
    const { sessionId, status } = parsed.data;

    const session = await db.preConsultationSession.update({
      where: { id: sessionId },
      data: {
        status: status as SessionStatus,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    });

    logger.info('session_updated', { sessionId, status });

    return NextResponse.json({ session });
  } catch (error) {
    logger.error('session_update_error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
