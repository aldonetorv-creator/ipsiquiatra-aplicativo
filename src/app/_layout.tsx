import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { useDailyReminders } from '@/hooks/use-daily-reminders';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';
import { PatientSessionProvider } from '@/services/patient-session';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <PatientAppGatewayProvider>
      <PatientSessionProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <DailyReminders />
          <AppTabs />
        </ThemeProvider>
      </PatientSessionProvider>
    </PatientAppGatewayProvider>
  );
}

// Precisa estar dentro do provider para ler o diário de humor pelo gateway.
function DailyReminders() {
  useDailyReminders();
  return null;
}
