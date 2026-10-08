import { SymbolView } from 'expo-symbols';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

const colors = {
  background: '#FDEFF1',
  border: '#F3C4CC',
  text: '#7A1F2E',
};

// Orientações de emergência, as mesmas da Patrícia da plataforma: SAMU 192,
// pronto-socorro e CVV 188.
export function EmergencyCard() {
  return (
    <View style={styles.card} accessibilityRole="alert">
      <View style={styles.header}>
        <SymbolView
          name={{ ios: 'heart.circle.fill', android: 'emergency', web: 'emergency' }}
          tintColor={colors.text}
          size={22}
        />
        <ThemedText type="smallBold" style={styles.title}>
          Você não está sozinho(a). Procure ajuda agora.
        </ThemedText>
      </View>
      <ThemedText type="small" style={styles.text}>
        Se você está pensando em se machucar ou em morrer, ligue para o SAMU (192) ou vá ao
        pronto-socorro mais próximo. O CVV atende 24 horas pelo 188, com ligação gratuita, ou pelo
        chat em cvv.org.br.
      </ThemedText>
      <ThemedText type="small" style={styles.text}>
        Esta versão de demonstração ainda não avisa o Dr. Aldo.
      </ThemedText>
      <View style={styles.actions}>
        <CallButton label="Ligar para o SAMU (192)" phone="192" />
        <CallButton label="Ligar para o CVV (188)" phone="188" />
      </View>
    </View>
  );
}

function CallButton({ label, phone }: { label: string; phone: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => Linking.openURL(`tel:${phone}`).catch(() => undefined)}
      style={({ pressed }) => [styles.call, pressed && styles.pressed]}>
      <SymbolView
        name={{ ios: 'phone.fill', android: 'call', web: 'call' }}
        tintColor={colors.text}
        size={16}
      />
      <ThemedText type="smallBold" style={styles.callText}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    color: colors.text,
  },
  text: {
    color: colors.text,
  },
  actions: {
    gap: 8,
    marginTop: 4,
  },
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.6,
  },
  callText: {
    color: colors.text,
  },
});
