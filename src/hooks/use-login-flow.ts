import { useCallback, useEffect, useRef, useState } from 'react';

import { authTexts, AuthFailure, AuthResult, LoginChallenge } from '@/contracts/patient-auth';
import { usePatientSession } from '@/services/patient-session';
import { isValidCpf, maskCpf } from '@/utils/patient-data';

export const CODE_LENGTH = 6;

const digits = (value: string) => value.replace(/\D/g, '');

export function failureText(failure: AuthFailure) {
  if (failure.reason === 'wrong_code' && failure.attemptsLeft !== undefined) {
    return `${failure.message} ${
      failure.attemptsLeft === 1
        ? 'Resta 1 tentativa.'
        : `Restam ${failure.attemptsLeft} tentativas.`
    }`;
  }
  return failure.message;
}

// Código errado, vencido ou bloqueado não serve mais: o campo volta vazio. Sem
// conexão, o código continua lá para tentar de novo.
const discardsCode: AuthFailure['reason'][] = ['wrong_code', 'expired', 'locked'];

// Entrar com CPF e código por SMS: primeiro o CPF, depois o código. O CPF vai
// só para a plataforma; o app guarda apenas a sessão. Ao entrar, a sessão muda
// e as abas aparecem no lugar da tela de entrar (components/app-tabs.tsx).
export function useLoginFlow() {
  const { startLogin, resendCode, verifyCode, demoCode } = usePatientSession();
  const [cpf, setCpfValue] = useState('');
  const [code, setCodeValue] = useState('');
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  // Um pedido por vez, mesmo com toques seguidos antes de a tela atualizar.
  const busy = useRef(false);

  useEffect(() => {
    if (!challenge) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [challenge]);

  const run = async <T>(request: () => Promise<AuthResult<T>>): Promise<AuthResult<T>> => {
    busy.current = true;
    setSending(true);
    setError(null);
    try {
      return await request();
    } catch {
      return { ok: false, reason: 'offline', message: authTexts.offline };
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  const received = (next: LoginChallenge) => {
    setChallenge(next);
    setCodeValue('');
    setResendAt(Date.now() + next.resendInSec * 1000);
    setNowMs(Date.now());
  };

  const setCpf = (value: string) => {
    const masked = maskCpf(value);
    setCpfValue(masked);
    // Com os 11 números, o aviso de CPF inválido aparece sem precisar tocar.
    setError(digits(masked).length === 11 && !isValidCpf(masked) ? authTexts.invalidCpf : null);
  };

  const requestCode = async () => {
    if (busy.current) return;
    if (!isValidCpf(cpf)) {
      setError(authTexts.invalidCpf);
      return;
    }
    const result = await run(() => startLogin(cpf));
    if (result.ok) received(result.data);
    else setError(failureText(result));
  };

  const resend = async () => {
    if (!challenge || busy.current) return;
    const result = await run(() => resendCode(challenge.challengeId));
    if (result.ok) received(result.data);
    else setError(failureText(result));
  };

  const confirm = async (typed = code) => {
    if (!challenge || busy.current || typed.length !== CODE_LENGTH) return;
    const result = await run(() => verifyCode(challenge.challengeId, typed));
    // Deu certo: a tela de entrar some (rota protegida), nada mais a fazer aqui.
    if (result.ok) return;
    setError(failureText(result));
    if (discardsCode.includes(result.reason)) setCodeValue('');
  };

  // Com os 6 números, o código é conferido sozinho.
  const setCode = (value: string) => {
    const typed = digits(value).slice(0, CODE_LENGTH);
    setCodeValue(typed);
    if (typed.length === CODE_LENGTH) confirm(typed);
    else if (!busy.current) setError(null);
  };

  const changeCpf = useCallback(() => {
    setChallenge(null);
    setCodeValue('');
    setError(null);
  }, []);

  return {
    cpf,
    setCpf,
    cpfComplete: digits(cpf).length === 11,
    requestCode,
    challenge,
    code,
    setCode,
    confirm,
    resend,
    resendIn: Math.max(0, Math.ceil((resendAt - nowMs) / 1000)),
    changeCpf,
    error,
    sending,
    demoCode,
  };
}

export type LoginFlow = ReturnType<typeof useLoginFlow>;
