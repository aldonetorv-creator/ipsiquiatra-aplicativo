import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';

import {
  AuthResult,
  LoginChallenge,
  PatientAuthApi,
  PatientSession,
} from '@/contracts/patient-auth';
import { patientAppMode, patriciaSlug, platformUrl } from '@/config/platform';
import { createMockPatientAuth, DEMO_LOGIN_CODE } from '@/mocks/patient-auth';
import { BiometricAuth, BiometricKind, createDeviceBiometrics } from '@/services/biometrics';
import { createPatientAuthHttpApi } from '@/services/patient-auth-api';
import { AttachableSessionLink, patientSessionLink } from '@/services/session-link';

type SecureStoreModule = typeof import('expo-secure-store');

// Onde a sessão do paciente fica entre uma abertura e outra do app, com a
// escolha de entrar pela biometria neste aparelho.
export interface SessionStore {
  load(): Promise<PatientSession | null>;
  save(session: PatientSession): Promise<void>;
  // Apaga a sessão e a escolha da biometria.
  clear(): Promise<void>;
  loadBiometricUnlock(): Promise<boolean>;
  saveBiometricUnlock(enabled: boolean): Promise<void>;
}

export const SESSION_KEY_NAME = 'ipsiquiatra.patient-session';
export const BIOMETRIC_KEY_NAME = 'ipsiquiatra.biometric-unlock';

export function createMemorySessionStore(
  initial: PatientSession | null = null,
  { biometricUnlock = false } = {}
): SessionStore {
  let saved = initial;
  let biometrics = biometricUnlock;
  return {
    async load() {
      return saved;
    },
    async save(session) {
      saved = session;
    },
    async clear() {
      saved = null;
      biometrics = false;
    },
    async loadBiometricUnlock() {
      return biometrics;
    },
    async saveBiometricUnlock(enabled) {
      biometrics = enabled;
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
    async clear() {
      await Promise.all([
        secureStore.deleteItemAsync(SESSION_KEY_NAME),
        secureStore.deleteItemAsync(BIOMETRIC_KEY_NAME),
      ]);
    },
    loadBiometricUnlock: async () => (await secureStore.getItemAsync(BIOMETRIC_KEY_NAME)) === 'on',
    saveBiometricUnlock: (enabled) =>
      enabled
        ? secureStore.setItemAsync(BIOMETRIC_KEY_NAME, 'on')
        : secureStore.deleteItemAsync(BIOMETRIC_KEY_NAME),
  };
}

export type SessionState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  // Há sessão, mas o paciente escolheu entrar pela biometria: falta ela.
  | { status: 'locked'; session: PatientSession }
  | { status: 'signed_in'; session: PatientSession };

type SessionContext = {
  state: SessionState;
  // Código fixo da demonstração; null quando o login for o da plataforma.
  demoCode: string | null;
  startLogin: PatientAuthApi['startLogin'];
  resendCode: PatientAuthApi['resendCode'];
  verifyCode: (challengeId: string, code: string) => Promise<AuthResult<PatientSession>>;
  logout: () => Promise<void>;
  // Biometria cadastrada no aparelho (null se nenhuma) e se o paciente a ligou.
  biometricKind: BiometricKind | null;
  biometricUnlock: boolean;
  // Logo depois do login por SMS, o app oferece entrar pela biometria.
  offerBiometrics: boolean;
  enableBiometrics: () => Promise<boolean>;
  declineBiometrics: () => void;
  disableBiometrics: () => Promise<void>;
  unlock: () => Promise<boolean>;
};

const Context = createContext<SessionContext | null>(null);

// Depois de tanto tempo fora do app, a biometria é pedida de novo.
export const LOCK_AFTER_MS = 5 * 60 * 1000;

type ProviderProps = {
  api?: PatientAuthApi;
  store?: SessionStore;
  biometrics?: BiometricAuth;
  demoCode?: string | null;
  // Por onde o gateway da plataforma lê o token e avisa que a sessão acabou.
  link?: AttachableSessionLink;
  now?: () => Date;
  children: ReactNode;
};

// Login de verdade no modo 'real' (config/platform.ts, docs/api-paciente.md);
// no modo 'demo', o simulado, com o código fixo.
const realMode = patientAppMode === 'real';
const defaultApi = realMode
  ? createPatientAuthHttpApi({ baseUrl: platformUrl, slug: patriciaSlug })
  : createMockPatientAuth();
const defaultDemoCode = realMode ? null : DEMO_LOGIN_CODE;
let defaultStore: SessionStore | null = null;
let defaultBiometrics: BiometricAuth | null = null;
const systemNow = () => new Date();

export function PatientSessionProvider({
  api = defaultApi,
  store,
  biometrics,
  demoCode = defaultDemoCode,
  link = patientSessionLink,
  now = systemNow,
  children,
}: ProviderProps) {
  const [sessionStore] = useState(() => store ?? (defaultStore ??= createDeviceSessionStore()));
  const [biometricAuth] = useState(
    () => biometrics ?? (defaultBiometrics ??= createDeviceBiometrics())
  );
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const [biometricKind, setBiometricKind] = useState<BiometricKind | null>(null);
  const [biometricUnlock, setBiometricUnlock] = useState(false);
  const [offerBiometrics, setOfferBiometrics] = useState(false);
  // Um pedido de biometria por vez (a tela pede sozinha e o botão também).
  const authenticating = useRef(false);
  const leftAt = useRef<number | null>(null);
  // Token da sessão atual, para o gateway da plataforma ler fora da tela.
  const tokenRef = useRef<string | null>(null);
  // Troca a sessão (entrou, saiu): o token acompanha.
  const enter = useCallback((next: SessionState) => {
    tokenRef.current = 'session' in next ? next.session.token : null;
    setState(next);
  }, []);

  // A sessão acabou na plataforma (401 signed_out): sai só do celular, sem
  // chamar a logout, porque o token já não vale. As abas somem e o app volta
  // à tela de entrar.
  const endSession = useCallback(() => {
    if (tokenRef.current === null) return;
    enter({ status: 'signed_out' });
    setBiometricUnlock(false);
    setOfferBiometrics(false);
    sessionStore.clear().catch(() => undefined);
  }, [enter, sessionStore]);

  useEffect(
    () => link.attach({ token: () => tokenRef.current, signedOut: endSession }),
    [link, endSession]
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      sessionStore.load().catch(() => null),
      sessionStore.loadBiometricUnlock().catch(() => false),
      biometricAuth.check().catch(() => null),
    ]).then(([session, unlockOn, kind]) => {
      if (!active) return;
      setBiometricKind(kind);
      // Sessão vencida não vale: o paciente entra de novo.
      if (!session || new Date(session.expiresAt) <= now()) {
        if (session) sessionStore.clear().catch(() => undefined);
        enter({ status: 'signed_out' });
        return;
      }
      if (unlockOn && !kind) {
        // A biometria estava ligada, mas o aparelho não tem mais nenhuma
        // cadastrada: por segurança, o paciente entra de novo pelo SMS.
        sessionStore.clear().catch(() => undefined);
        api.logout(session.token).catch(() => undefined);
        enter({ status: 'signed_out' });
        return;
      }
      if (unlockOn) {
        setBiometricUnlock(true);
        enter({ status: 'locked', session });
      } else {
        enter({ status: 'signed_in', session });
      }
      // Confere na plataforma se a sessão salva ainda vale (Sair em outro
      // aparelho, celular trocado no cadastro). Sem conexão, fica como está.
      api
        .checkSession?.(session.token)
        .then((check) => {
          if (active && check.status === 'signed_out') endSession();
        })
        .catch(() => undefined);
    });
    return () => {
      active = false;
    };
    // Lê a sessão salva só ao abrir o app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStore, biometricAuth]);

  // Depois de um tempo fora do app, pede a biometria de novo, como nos bancos.
  // A janela da biometria e a senha do celular deixam o app só por instantes.
  useEffect(() => {
    if (!biometricUnlock) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        leftAt.current = now().getTime();
        return;
      }
      if (next !== 'active' || leftAt.current === null) return;
      const away = now().getTime() - leftAt.current;
      leftAt.current = null;
      if (away < LOCK_AFTER_MS) return;
      setState((current) =>
        current.status === 'signed_in' ? { status: 'locked', session: current.session } : current
      );
    });
    return () => subscription.remove();
  }, [biometricUnlock, now]);

  const verifyCode = useCallback(
    async (challengeId: string, code: string) => {
      const result = await api.verifyCode(challengeId, code);
      if (result.ok) {
        const kind = await biometricAuth.check().catch(() => null);
        // Se o aparelho não guardar, o paciente continua dentro até fechar o app.
        await sessionStore.save(result.data).catch(() => undefined);
        setBiometricKind(kind);
        setOfferBiometrics(kind !== null);
        enter({ status: 'signed_in', session: result.data });
      }
      return result;
    },
    [api, enter, sessionStore, biometricAuth]
  );

  const confirmBiometrics = useCallback(
    async (prompt: string) => {
      if (authenticating.current) return false;
      authenticating.current = true;
      try {
        return await biometricAuth.authenticate(prompt);
      } finally {
        authenticating.current = false;
      }
    },
    [biometricAuth]
  );

  // Ligar pede a biometria uma vez, para confirmar que ela funciona.
  const enableBiometrics = useCallback(async () => {
    if (!(await confirmBiometrics('Confirme para entrar com biometria'))) return false;
    try {
      await sessionStore.saveBiometricUnlock(true);
    } catch {
      return false;
    }
    setBiometricUnlock(true);
    setOfferBiometrics(false);
    return true;
  }, [confirmBiometrics, sessionStore]);

  const declineBiometrics = useCallback(() => setOfferBiometrics(false), []);

  const disableBiometrics = useCallback(async () => {
    setBiometricUnlock(false);
    await sessionStore.saveBiometricUnlock(false).catch(() => undefined);
  }, [sessionStore]);

  const unlock = useCallback(async () => {
    if (state.status !== 'locked') return false;
    const ok = await confirmBiometrics('Entrar no iPsiquiatra');
    if (ok) {
      setState((current) =>
        current.status === 'locked' ? { status: 'signed_in', session: current.session } : current
      );
    }
    return ok;
  }, [confirmBiometrics, state.status]);

  // Sair apaga a sessão e desliga a biometria: a próxima entrada é pelo SMS.
  const logout = useCallback(async () => {
    const current =
      state.status === 'signed_in' || state.status === 'locked' ? state.session : null;
    enter({ status: 'signed_out' });
    setBiometricUnlock(false);
    setOfferBiometrics(false);
    await sessionStore.clear().catch(() => undefined);
    if (current) await api.logout(current.token).catch(() => undefined);
  }, [api, enter, sessionStore, state]);

  const value = useMemo<SessionContext>(
    () => ({
      state,
      demoCode,
      startLogin: (cpf: string): Promise<AuthResult<LoginChallenge>> => api.startLogin(cpf),
      resendCode: (challengeId: string) => api.resendCode(challengeId),
      verifyCode,
      logout,
      biometricKind,
      biometricUnlock,
      offerBiometrics,
      enableBiometrics,
      declineBiometrics,
      disableBiometrics,
      unlock,
    }),
    [
      api,
      biometricKind,
      biometricUnlock,
      declineBiometrics,
      demoCode,
      disableBiometrics,
      enableBiometrics,
      logout,
      offerBiometrics,
      state,
      unlock,
      verifyCode,
    ]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePatientSession() {
  const value = useContext(Context);
  if (!value) throw new Error('usePatientSession precisa do PatientSessionProvider.');
  return value;
}
