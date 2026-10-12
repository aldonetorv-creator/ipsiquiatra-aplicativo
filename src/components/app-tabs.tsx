import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { Tokens } from '@/constants/theme';
import { MvpAreaId } from '@/contracts/mvp';
import { mvpAreas } from '@/mocks/mvp';
import { usePatientSession } from '@/services/patient-session';

// Áreas com ícone aparecem na barra; as demais (ex.: Questionários) são
// rotas acessíveis por cartões, fora da barra.
//
// Sem sessão, a única tela é a de entrar com CPF (decisão do Dr. Aldo,
// 12/10/2026): as abas nem existem até o login, e "Sair" volta para ela.
const tabIcons: Partial<Record<MvpAreaId, SymbolViewProps['name']>> = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  patricia: { ios: 'bubble.left.fill', android: 'chat_bubble', web: 'chat_bubble' },
  consultas: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  cofre: { ios: 'lock.fill', android: 'lock', web: 'lock' },
};

export default function AppTabs() {
  const signedIn = usePatientSession().state.status === 'signed_in';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Tokens.color.brand,
        tabBarInactiveTintColor: Tokens.color.muted,
        tabBarStyle: {
          backgroundColor: Tokens.color.surface,
          borderTopColor: Tokens.color.border,
        },
      }}>
      <Tabs.Protected guard={signedIn}>
        {mvpAreas.map((area) => {
          const icon = tabIcons[area.id];
          return (
            <Tabs.Screen
              key={area.id}
              name={area.id === 'home' ? 'index' : area.id}
              options={{
                title: area.label,
                href: icon ? undefined : null,
                tabBarIcon: icon
                  ? ({ color, size }) => <SymbolView name={icon} tintColor={color} size={size} />
                  : undefined,
              }}
            />
          );
        })}
      </Tabs.Protected>
      <Tabs.Protected guard={!signedIn}>
        <Tabs.Screen
          name="entrar"
          options={{ title: 'Entrar', href: null, tabBarStyle: { display: 'none' } }}
        />
      </Tabs.Protected>
    </Tabs>
  );
}
