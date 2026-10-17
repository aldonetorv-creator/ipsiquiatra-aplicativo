import {
  ApiFailure,
  ApiResult,
  Appointment,
  CarePlan,
  DocumentMetadata,
  MedicationPlan,
  PatientAppGateway,
} from '@/contracts/platform';
import { authTexts } from '@/contracts/patient-auth';
import {
  createPatientAppHttp,
  PatientAppHttpOptions,
  PatientAppReply,
  signedOutReply,
  succeeded,
} from '@/services/patient-app-http';
import { SessionLink } from '@/services/session-link';

const REQUEST_ID = 'patient-app';

export const gatewayTexts = {
  signedOut: 'Sua sessão terminou. Entre de novo com CPF e SMS.',
  unavailable: authTexts.unavailable,
  offline: authTexts.offline,
  rateLimited: authTexts.rateLimited,
};

const failure = (code: ApiFailure['error']['code'], message: string): ApiFailure => ({
  ok: false,
  error: { code, message },
  requestId: REQUEST_ID,
});

type Options = PatientAppHttpOptions & {
  // De onde vem o token, e quem avisar quando a sessão acabar.
  session: SessionLink;
  // O que ainda não vem da plataforma (conversa, humor, questionários e a
  // Patrícia) continua no gateway local.
  local: PatientAppGateway;
};

// Gateway com os dados de verdade (docs/api-paciente.md): consultas,
// documentos, medicações e plano de cuidados das rotas
// /api/patient-app/<slug>/... com o token do login. Um 401 signed_out tira o
// paciente do app, que volta à tela de entrar.
export function createPlatformPatientAppGateway({
  session,
  local,
  ...http
}: Options): PatientAppGateway {
  const request = createPatientAppHttp(http);

  async function read<T>(path: string, pick: (body: Record<string, unknown>) => T | undefined) {
    const token = session.token();
    if (!token) return failure('not_authorized', gatewayTexts.signedOut);
    const reply: PatientAppReply = await request(path, { token });
    if (signedOutReply(reply)) {
      session.signedOut();
      return failure('not_authorized', gatewayTexts.signedOut);
    }
    if (!reply) return failure('not_available', gatewayTexts.offline);
    if (reply.status === 429) return failure('not_available', gatewayTexts.rateLimited);
    if (!succeeded(reply)) return failure('not_available', gatewayTexts.unavailable);
    const data = pick(reply.body);
    if (data === undefined) return failure('not_available', gatewayTexts.unavailable);
    return { ok: true, data, requestId: REQUEST_ID } as ApiResult<T>;
  }

  const listOf =
    <T>(key: string) =>
    (body: Record<string, unknown>) =>
      Array.isArray(body[key])
        ? (body[key] as unknown[]).filter((item): item is T => !!item && typeof item === 'object')
        : undefined;
  // `plan` pode ser null (ainda não há receita ou plano).
  const planOf =
    <T>() =>
    (body: Record<string, unknown>) =>
      body.plan === null
        ? null
        : body.plan && typeof body.plan === 'object'
          ? (body.plan as T)
          : undefined;

  return {
    ...local,
    listAppointments: () => read('/appointments', listOf<Appointment>('appointments')),
    listDocuments: () => read('/documents', listOf<DocumentMetadata>('documents')),
    getMedicationPlan: () => read('/medications', planOf<MedicationPlan>()),
    getCarePlan: (documentId) =>
      read(
        documentId ? `/care-plan?document=${encodeURIComponent(documentId)}` : '/care-plan',
        planOf<CarePlan>()
      ),
    dataMode: () => 'real',
  };
}
