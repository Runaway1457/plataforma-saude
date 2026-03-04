import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Priority } from '@prisma/client';
import { db } from '@/lib/db';
import { requireRole, withAuth } from '@/lib/auth-guard';
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

    const consultationSession = await db.preConsultationSession.findUnique({
      where: { id: data.sessionId },
    });
    if (!consultationSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

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

    if (data.triageAccepted === false && data.triageCorrectedTo) {
      await db.triageAssessment.updateMany({
        where: { sessionId: data.sessionId },
        data: { priority: data.triageCorrectedTo },
      });
    }

    await db.preConsultationSession.update({
      where: { id: data.sessionId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

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
