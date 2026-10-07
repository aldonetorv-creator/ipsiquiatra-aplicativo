/// <reference types="jest" />

import { DocumentMetadata } from '@/contracts/platform';
import { mockPatientAppGateway } from '@/mocks/patient-app-gateway';

const kinds: DocumentMetadata['kind'][] = ['receipt', 'certificate', 'guidance'];

describe('mockPatientAppGateway', () => {
  it('lista documentos fictícios que respeitam o contrato', async () => {
    const result = await mockPatientAppGateway.listDocuments();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.requestId).toEqual(expect.any(String));
    expect(result.data.length).toBeGreaterThan(0);

    const ids = result.data.map((doc) => doc.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const doc of result.data) {
      expect(kinds).toContain(doc.kind);
      expect(doc.displayName).not.toHaveLength(0);
      expect(doc.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
      // Sem dados reais nesta fase: todo documento do mock é só exemplo.
      expect(doc.availability).toBe('mock_only');
    }
  });

  it('informa consentimento ainda não solicitado', async () => {
    const result = await mockPatientAppGateway.readConsent();

    expect(result).toEqual({
      ok: true,
      requestId: expect.any(String),
      data: { policyVersion: 'not-published', acceptedAt: null, status: 'not_requested' },
    });
  });
});
