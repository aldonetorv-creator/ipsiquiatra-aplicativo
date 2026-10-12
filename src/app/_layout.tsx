import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { useDailyReminders } from '@/hooks/use-daily-reminders';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';
import { PatientSessionProvider, usePatientSession } from '@/services/patient-session';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <PatientAppGatewayProvider>
      <PatientSessionProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <SplashUntilSession />
          <DailyReminders />
          <AppTabs />
        </ThemeProvider>
      </PatientSessionProvider>
    </PatientAppGatewayProvider>
  );
}

// A abertura animada só some depois que o app sabe se há sessão salva: quem já
// entrou não vê a tela de login piscar.
function SplashUntilSession() {
  const { state } = usePatientSession();
  return <AnimatedSplashOverlay ready={state.status !== 'loading'} />;
}

// Precisa estar dentro do provider para ler o diário de humor pelo gateway.
function DailyReminders() {
  useDailyReminders();
  return null;
}
