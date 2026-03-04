/**
 * Testes para o serviço de consentimento LGPD
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do Prisma client
const mockDb = {
  consentRecord: {
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  hasActiveConsent,
  grantConsent,
  revokeConsent,
  getPatientConsents,
  ConsentType,
  LegalBasis,
} from './consent-service';

describe('Consent Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasActiveConsent', () => {
    it('deve retornar true quando consentimento ativo existe', async () => {
      mockDb.consentRecord.findFirst.mockResolvedValueOnce({
        id: 'consent-1',
        patientId: 'patient-1',
        consentType: 'PRE_CONSULTATION_AI',
        granted: true,
      });

      const result = await hasActiveConsent('patient-1', ConsentType.PRE_CONSULTATION_AI);

      expect(result).toBe(true);
      expect(mockDb.consentRecord.findFirst).toHaveBeenCalledWith({
        where: {
          patientId: 'patient-1',
          consentType: ConsentType.PRE_CONSULTATION_AI,
          granted: true,
          revokedAt: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } },
          ],
        },
      });
    });

    it('deve retornar false quando não há consentimento', async () => {
      mockDb.consentRecord.findFirst.mockResolvedValueOnce(null);

      const result = await hasActiveConsent('patient-1', ConsentType.PRE_CONSULTATION_AI);

      expect(result).toBe(false);
    });
  });

  describe('grantConsent', () => {
    it('deve criar registro de consentimento', async () => {
      const mockRecord = {
        id: 'consent-1',
        patientId: 'patient-1',
        consentType: ConsentType.PRE_CONSULTATION_AI,
        granted: true,
        grantedAt: expect.any(Date),
      };

      mockDb.consentRecord.create.mockResolvedValueOnce(mockRecord);

      const result = await grantConsent({
        patientId: 'patient-1',
        consentType: ConsentType.PRE_CONSULTATION_AI,
        purpose: 'Uso de IA na pré-consulta',
        legalBasis: LegalBasis.CONSENT,
        documentVersion: 'v1.0',
      });

      expect(result).toEqual(mockRecord);
      expect(mockDb.consentRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: 'patient-1',
          consentType: ConsentType.PRE_CONSULTATION_AI,
          granted: true,
        }),
      });
    });

    it('deve registrar IP e User-Agent quando fornecidos', async () => {
      mockDb.consentRecord.create.mockResolvedValueOnce({ id: 'consent-1' });

      await grantConsent({
        patientId: 'patient-1',
        consentType: ConsentType.PRE_CONSULTATION_AI,
        purpose: 'Teste',
        legalBasis: LegalBasis.CONSENT,
        documentVersion: 'v1.0',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockDb.consentRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
          }),
        })
      );
    });
  });

  describe('revokeConsent', () => {
    it('deve revogar consentimentos ativos', async () => {
      mockDb.consentRecord.updateMany.mockResolvedValueOnce({ count: 1 });

      await revokeConsent('patient-1', ConsentType.PRE_CONSULTATION_AI);

      expect(mockDb.consentRecord.updateMany).toHaveBeenCalledWith({
        where: {
          patientId: 'patient-1',
          consentType: ConsentType.PRE_CONSULTATION_AI,
          granted: true,
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
          granted: false,
        },
      });
    });
  });

  describe('getPatientConsents', () => {
    it('deve retornar todos os consentimentos do paciente', async () => {
      const mockConsents = [
        { id: 'consent-1', consentType: ConsentType.PRE_CONSULTATION_AI },
        { id: 'consent-2', consentType: ConsentType.DATA_PROCESSING },
      ];

      mockDb.consentRecord.findMany.mockResolvedValueOnce(mockConsents);

      const result = await getPatientConsents('patient-1');

      expect(result).toEqual(mockConsents);
      expect(mockDb.consentRecord.findMany).toHaveBeenCalledWith({
        where: { patientId: 'patient-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
