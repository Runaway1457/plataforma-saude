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
