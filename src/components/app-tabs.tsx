import { Tabs } from 'expo-router';

import { mvpAreas } from '@/mocks/mvp';

export default function AppTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
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
