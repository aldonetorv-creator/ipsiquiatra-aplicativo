export type ApiSuccess<T> = {
  ok: true;
  data: T;
  requestId: string;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: 'not_available' | 'not_authorized' | 'validation_failed';
    message: string;
  };
  requestId: string;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type ConsentRecord = {
  policyVersion: string;
  acceptedAt: string | null;
  status: 'not_requested' | 'accepted' | 'revoked';
};

export type DocumentMetadata = {
  id: string;
  displayName: string;
  kind: 'receipt' | 'certificate' | 'guidance';
  createdAt: string;
  availability: 'mock_only' | 'available' | 'expired';
};

export interface PatientAppGateway {
  listDocuments(): Promise<ApiResult<DocumentMetadata[]>>;
  readConsent(): Promise<ApiResult<ConsentRecord>>;
}
