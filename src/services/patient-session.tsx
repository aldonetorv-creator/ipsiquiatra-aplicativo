import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import {
  AuthResult,
  LoginChallenge,
  PatientAuthApi,
  PatientSession,
} from '@/contracts/patient-auth';
import { createMockPatientAuth, DEMO_LOGIN_CODE } from '@/mocks/patient-auth';

type SecureStoreModule = typeof import('expo-secure-store');

// Onde a sessão do paciente fica entre uma abertura e outra do app.
export interface SessionStore {
  load(): Promise<PatientSession | null>;
  save(session: PatientSession): Promise<void>;
  clear(): Promise<void>;
}

export const SESSION_KEY_NAME = 'ipsiquiatra.patient-session';

export function createMemorySessionStore(initial: PatientSession | null = null): SessionStore {
  let saved = initial;
  return {
    async load() {
      return saved;
    },
    async save(session) {
      saved = session;
    },
    async clear() {
      saved = null;
    },
  };
}

// No celular, a sessão fica no armazenamento seguro do sistema (Keychain ou
// Keystore), como a chave do histórico. Na web, só enquanto a página estiver
// aberta.
export function createDeviceSessionStore(): SessionStore {
  if (Platform.OS === 'web') return createMemorySessionStore();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const secureStore = require('expo-secure-store') as SecureStoreModule;
  return {
    async load() {
      const raw = await secureStore.getItemAsync(SESSION_KEY_NAME);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as PatientSession;
      } catch {
        return null;
      }
    },
    save: (session) => secureStore.setItemAsync(SESSION_KEY_NAME, JSON.stringify(session)),
    clear: () => secureStore.deleteItemAsync(SESSION_KEY_NAME),
  };
}

export type SessionState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'signed_in'; session: PatientSession };

type SessionContext = {
  state: SessionState;
  // Código fixo da demonstração; null quando o login for o da plataforma.
  demoCode: string | null;
  startLogin: PatientAuthApi['startLogin'];
  resendCode: PatientAuthApi['resendCode'];
  verifyCode: (challengeId: string, code: string) => Promise<AuthResult<PatientSession>>;
  logout: () => Promise<void>;
};

const Context = createContext<SessionContext | null>(null);

type ProviderProps = {
  api?: PatientAuthApi;
  store?: SessionStore;
  demoCode?: string | null;
  now?: () => Date;
  children: ReactNode;
};

// Por enquanto o login é o simulado (docs/api-paciente.md): a plataforma ainda
// não tem as rotas do paciente.
const defaultApi = createMockPatientAuth();
let defaultStore: SessionStore | null = null;

export function PatientSessionProvider({
  api = defaultApi,
  store,
  demoCode = DEMO_LOGIN_CODE,
  now = () => new Date(),
  children,
}: ProviderProps) {
  const [sessionStore] = useState(() => store ?? (defaultStore ??= createDeviceSessionStore()));
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    sessionStore
      .load()
      .catch(() => null)
      .then((session) => {
        if (!active) return;
        // Sessão vencida não vale: o paciente entra de novo.
        if (session && new Date(session.expiresAt) > now()) {
          setState({ status: 'signed_in', session });
        } else {
          if (session) sessionStore.clear().catch(() => undefined);
          setState({ status: 'signed_out' });
        }
      });
    return () => {
      active = false;
    };
    // Lê a sessão salva só ao abrir o app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStore]);

  const verifyCode = useCallback(
    async (challengeId: string, code: string) => {
      const result = await api.verifyCode(challengeId, code);
      if (result.ok) {
        // Se o aparelho não guardar, o paciente continua dentro até fechar o app.
        await sessionStore.save(result.data).catch(() => undefined);
        setState({ status: 'signed_in', session: result.data });
      }
      return result;
    },
    [api, sessionStore]
  );

  const logout = useCallback(async () => {
    const current = state.status === 'signed_in' ? state.session : null;
    setState({ status: 'signed_out' });
    await sessionStore.clear().catch(() => undefined);
    if (current) await api.logout(current.token).catch(() => undefined);
  }, [api, sessionStore, state]);

  const value = useMemo<SessionContext>(
    () => ({
      state,
      demoCode,
      startLogin: (cpf: string): Promise<AuthResult<LoginChallenge>> => api.startLogin(cpf),
      resendCode: (challengeId: string) => api.resendCode(challengeId),
      verifyCode,
      logout,
    }),
    [api, demoCode, logout, state, verifyCode]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePatientSession() {
  const value = useContext(Context);
  if (!value) throw new Error('usePatientSession precisa do PatientSessionProvider.');
  return value;
}
