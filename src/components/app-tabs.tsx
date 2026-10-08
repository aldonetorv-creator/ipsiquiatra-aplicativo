import { Tabs } from 'expo-router';

import { Tokens } from '@/constants/theme';
import { mvpAreas } from '@/mocks/mvp';

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
      {mvpAreas.map((area) => (
        <Tabs.Screen
          key={area.id}
          name={area.id === 'home' ? 'index' : area.id}
          options={{ title: area.label }}
        />
      ))}
    </Tabs>
  );
}
