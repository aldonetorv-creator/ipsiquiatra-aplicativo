import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { Tokens } from '@/constants/theme';
import { MvpAreaId } from '@/contracts/mvp';
import { mvpAreas } from '@/mocks/mvp';

// Áreas com ícone aparecem na barra; as demais (ex.: Questionários) são
// rotas acessíveis por cartões, fora da barra.
const tabIcons: Partial<Record<MvpAreaId, SymbolViewProps['name']>> = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  patricia: { ios: 'bubble.left.fill', android: 'chat_bubble', web: 'chat_bubble' },
  consultas: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  cofre: { ios: 'lock.fill', android: 'lock', web: 'lock' },
};

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Tokens.color.blue,
        tabBarInactiveTintColor: Tokens.color.muted,
        tabBarStyle: {
          backgroundColor: Tokens.color.surface,
          borderTopColor: Tokens.color.border,
        },
      }}>
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
    </Tabs>
  );
}
