import {
  ApiResult,
  ConsentRecord,
  DocumentMetadata,
  PatientAppGateway,
} from '@/contracts/platform';

const mockResult = <T>(data: T): ApiResult<T> => ({
  ok: true,
  data,
  requestId: 'local-sprint-zero',
});

// Documentos fictícios: nenhum dado real de paciente nem arquivo armazenado.
export const mockDocuments: DocumentMetadata[] = [
  {
    id: 'mock-certificate',
    displayName: 'Atestado de comparecimento',
    kind: 'certificate',
    createdAt: '2026-01-15',
    availability: 'mock_only',
  },
  {
    id: 'mock-receipt',
    displayName: 'Recibo de consulta',
    kind: 'receipt',
    createdAt: '2026-01-15',
    availability: 'mock_only',
  },
  {
    id: 'mock-guidance',
    displayName: 'Orientações gerais',
    kind: 'guidance',
    createdAt: '2026-01-15',
    availability: 'mock_only',
  },
];

export const mockPatientAppGateway: PatientAppGateway = {
  async listDocuments(): Promise<ApiResult<DocumentMetadata[]>> {
    return mockResult(mockDocuments);
  },
  async readConsent(): Promise<ApiResult<ConsentRecord>> {
    return mockResult({
      policyVersion: 'not-published',
      acceptedAt: null,
      status: 'not_requested',
    });
  },
};
