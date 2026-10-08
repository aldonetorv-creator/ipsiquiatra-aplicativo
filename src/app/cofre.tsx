import { StyleSheet } from 'react-native';

import { ListItem, Panel } from '@/components/mvp/cards';
import { ScreenShell } from '@/components/mvp/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { DocumentMetadata } from '@/contracts/platform';
import { useDocuments } from '@/hooks/use-documents';
import { mvpAreas } from '@/mocks/mvp';

const area = mvpAreas.find((item) => item.id === 'cofre')!;

const kindLabel: Record<DocumentMetadata['kind'], string> = {
  certificate: 'Atestado',
  receipt: 'Recibo',
  guidance: 'Orientações',
};

const availabilityLabel: Record<DocumentMetadata['availability'], string> = {
  mock_only: 'Somente exemplo',
  available: 'Disponível',
  expired: 'Expirado',
};

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export default function CofreScreen() {
  const documents = useDocuments();

  return (
    <ScreenShell eyebrow={area.eyebrow} title={area.title} description={area.description}>
      <Panel>
        <ThemedText type="subtitle" style={styles.title}>
          Documentos
        </ThemedText>
        {documents.status === 'loading' ? (
          <ThemedText type="small" style={styles.message}>
            Carregando documentos…
          </ThemedText>
        ) : documents.status === 'error' ? (
          <ThemedText type="small" style={styles.message}>
            {documents.error.message}
          </ThemedText>
        ) : documents.documents.length === 0 ? (
          <ThemedText type="small" style={styles.message}>
            Nenhum documento por aqui ainda.
          </ThemedText>
        ) : (
          documents.documents.map((doc) => (
            <ListItem key={doc.id} title={doc.displayName} meta={availabilityLabel[doc.availability]}>
              {`${kindLabel[doc.kind]} · ${formatDate(doc.createdAt)}`}
            </ListItem>
          ))
        )}
      </Panel>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: {
    color: Tokens.color.text,
    fontSize: 22,
    lineHeight: 28,
  },
  message: {
    color: Tokens.color.muted,
  },
});
