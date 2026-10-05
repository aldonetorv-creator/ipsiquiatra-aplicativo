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

export const mockPatientAppGateway: PatientAppGateway = {
  async listDocuments(): Promise<ApiResult<DocumentMetadata[]>> {
    return mockResult([]);
  },
  async readConsent(): Promise<ApiResult<ConsentRecord>> {
    return mockResult({
      policyVersion: 'not-published',
      acceptedAt: null,
      status: 'not_requested',
    });
  },
};
