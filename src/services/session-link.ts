// Ligação entre a sessão do paciente (services/patient-session.tsx) e o
// gateway da plataforma (services/patient-app-gateway-http.ts): o gateway lê o
// token por aqui e avisa quando a plataforma diz que a sessão acabou (401
// signed_out). A sessão então sai e o app volta à tela de entrar.
export type SessionLink = {
  token(): string | null;
  signedOut(): void;
};

export type AttachableSessionLink = SessionLink & {
  // Devolve a função que desliga (o provider desmontou).
  attach(target: SessionLink): () => void;
};

export function createSessionLink(): AttachableSessionLink {
  let current: SessionLink | null = null;
  return {
    token: () => current?.token() ?? null,
    signedOut: () => current?.signedOut(),
    attach(target) {
      current = target;
      return () => {
        if (current === target) current = null;
      };
    },
  };
}

// A ligação do app (a do gateway padrão e a do PatientSessionProvider padrão).
export const patientSessionLink = createSessionLink();
