import { StyleSheet, TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { boldSegments } from '@/utils/rich-text';

// Texto do plano de cuidados, com os trechos em **negrito**.
export function RichText({ text, style }: { text: string; style?: TextStyle }) {
  return (
    <ThemedText type="default" style={[styles.text, style]}>
      {boldSegments(text).map((segment, index) =>
        segment.bold ? (
          <ThemedText key={index} type="default" style={[styles.text, style, styles.bold]}>
            {segment.text}
          </ThemedText>
        ) : (
          segment.text
        )
      )}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  text: {
    color: Tokens.color.text,
    fontSize: 17,
    lineHeight: 26,
  },
  bold: {
    fontWeight: 700,
  },
});
