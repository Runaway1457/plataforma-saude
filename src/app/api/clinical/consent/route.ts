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
