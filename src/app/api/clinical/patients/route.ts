// ============================================================
// CLINICAL API - Patients List
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logger } from '@/lib/logger';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('id');

    if (patientId) {
      const patient = await db.patient.findUnique({
        where: { id: patientId },
        include: {
          conditions: true,
          medications: true,
          allergies: true,
          vitalSigns: { orderBy: { createdAt: 'desc' }, take: 10 },
          timelineEvents: { orderBy: { eventDate: 'desc' }, take: 20 },
        },
      });

      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      return NextResponse.json({ patient });
    }

    const patients = await db.patient.findMany({
      include: {
        conditions: { where: { status: 'ACTIVE' } },
        medications: { where: { status: 'ACTIVE' } },
        allergies: true,
        _count: {
          select: {
            conditions: true,
            medications: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    logger.info('patients_listed', { count: patients.length });
    return NextResponse.json({ patients });
  } catch (error) {
    logger.error('patients_api_error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(handler);
