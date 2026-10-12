import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Animated, BackHandler, Easing, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { CodeStep } from '@/components/auth/code-step';
import { CpfStep } from '@/components/auth/cpf-step';
import { UnlockScreen } from '@/components/auth/unlock-screen';
import { WelcomeStory } from '@/components/auth/welcome-story';
import { Tokens } from '@/constants/theme';
import { useLoginFlow } from '@/hooks/use-login-flow';
import { usePatientSession } from '@/services/patient-session';

type Step = 'welcome' | 'cpf' | 'code';
const order: Step[] = ['welcome', 'cpf', 'code'];

// Primeira tela do app (decisão do Dr. Aldo, 12/10/2026): antes de qualquer
// outra, o paciente entra com o CPF. As abas só existem depois do login
// (components/app-tabs.tsx). Quem ligou a biometria entra por ela.
export default function EntrarScreen() {
  const { state, logout } = usePatientSession();
  // Quem desistiu da biometria vai direto ao CPF, sem a história.
  const [skipStory, setSkipStory] = useState(false);

  if (state.status === 'locked') {
    return (
      <UnlockScreen
        firstName={state.session.patient.firstName}
        onUseSms={() => {
          setSkipStory(true);
          logout();
        }}
      />
    );
  }
  return <LoginScreen startAtCpf={skipStory} />;
}

// Primeiro uma história curta de boas-vindas; depois uma pergunta por tela: o
// CPF e o código do SMS.
function LoginScreen({ startAtCpf }: { startAtCpf: boolean }) {
  const flow = useLoginFlow();
  const { changeCpf } = flow;
  const [started, setStarted] = useState(startAtCpf);
  const step: Step = !started ? 'welcome' : flow.challenge ? 'code' : 'cpf';

  // A tela nova entra pelo lado para onde se anda: avançando, pela direita.
  const [previous, setPrevious] = useState(step);
  const [direction, setDirection] = useState(1);
  if (step !== previous) {
    setPrevious(step);
    setDirection(order.indexOf(step) > order.indexOf(previous) ? 1 : -1);
  }

  const back = useCallback(() => {
    if (step === 'code') changeCpf();
    else setStarted(false);
  }, [step, changeCpf]);

  // O voltar do Android volta um passo; na história, sai do app como sempre.
  useEffect(() => {
    if (step === 'welcome') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => subscription.remove();
  }, [step, back]);

  return (
    <StepTransition key={step} direction={direction} style={step === 'welcome' && styles.story}>
      {step === 'welcome' ? (
        <WelcomeStory onEnter={() => setStarted(true)} />
      ) : step === 'cpf' ? (
        <CpfStep flow={flow} onBack={back} />
      ) : (
        <CodeStep flow={flow} onBack={back} />
      )}
    </StepTransition>
  );
}

// A tela nova chega deslizando um pouco e aparecendo.
function StepTransition({
  direction,
  style,
  children,
}: {
  direction: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const [enter] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [enter]);

  return (
    <Animated.View
      style={[
        styles.step,
        style,
        {
          opacity: enter,
          transform: [
            {
              translateX: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [direction * 36, 0],
              }),
            },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  step: {
    flex: 1,
    backgroundColor: Tokens.color.surface,
  },
  story: {
    backgroundColor: Tokens.color.brandDeep,
  },
});
