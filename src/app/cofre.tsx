import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { PageScreen } from '@/components/ui/page-screen';
import { Tokens } from '@/constants/theme';
import { Appointment, DocumentMetadata } from '@/contracts/platform';
import { useDocuments } from '@/hooks/use-documents';
import {
  DocumentGroup,
  documentTitle,
  INVOICE_PENDING_TEXT,
  modalityLabel,
} from '@/utils/appointments';
import { dateBadge, formatDate, formatLongDate, formatTime } from '@/utils/time';

export default function CofreScreen() {
  const documents = useDocuments();

  return (
    <PageScreen title="Cofre" subtitle="Tudo o que foi entregue a você.">
      <View style={styles.notice}>
        <SymbolView
          name={{ ios: 'info.circle', android: 'info', web: 'info' }}
          tintColor={Tokens.color.brandDeep}
          size={18}
        />
        <ThemedText type="small" style={styles.noticeText}>
          Documentos de exemplo, para demonstração. Os arquivos ainda não abrem nesta versão.
        </ThemedText>
      </View>

      {documents.status === 'loading' ? (
        <ThemedText type="small" style={styles.muted}>
          Carregando documentos…
        </ThemedText>
      ) : documents.status === 'error' ? (
        <ThemedText type="default" style={styles.muted}>
          {documents.error}
        </ThemedText>
      ) : documents.groups.length === 0 ? (
        <ThemedText type="default" style={styles.muted}>
          Nenhum documento por aqui ainda.
        </ThemedText>
      ) : (
        documents.groups.map((group) => (
          <Group key={group.appointment?.id ?? 'loose'} group={group} />
        ))
      )}
    </PageScreen>
  );
}

function Group({ group }: { group: DocumentGroup }) {
  const { appointment } = group;
  const badge = appointment ? dateBadge(appointment.startsAt) : null;
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        {badge ? (
          <ThemedText type="smallBold" style={styles.groupDate}>
            {`${badge.day} ${badge.month}`}
          </ThemedText>
        ) : null}
        <ThemedText type="small" style={styles.muted}>
          {appointment ? 'Consulta e documentos' : 'Outros documentos'}
        </ThemedText>
      </View>
      <Card style={styles.groupCard}>
        {appointment ? <AppointmentRow appointment={appointment} /> : null}
        {group.documents.map((document) => (
          <DocumentRow key={document.id} document={document} appointment={appointment} />
        ))}
      </Card>
    </View>
  );
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  return (
    <View style={[styles.row, styles.appointmentRow]}>
      <IconBadge
        name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
        tone="blue"
        size={42}
      />
      <View style={styles.rowCopy}>
        <ThemedText type="smallBold" style={styles.rowTitle}>
          {`Consulta com ${appointment.doctor.name}`}
        </ThemedText>
        <ThemedText type="small" style={styles.muted}>
          {`${formatLongDate(appointment.startsAt)} · ${formatTime(appointment.startsAt)} · ${
            modalityLabel[appointment.modality]
          }`}
        </ThemedText>
      </View>
    </View>
  );
}

const statusIcon: Record<DocumentMetadata['availability'], SymbolViewProps['name']> = {
  mock_only: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  available: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  pending: { ios: 'clock', android: 'schedule', web: 'schedule' },
  expired: { ios: 'exclamationmark.circle', android: 'error', web: 'error' },
};

function statusText(document: DocumentMetadata) {
  switch (document.availability) {
    case 'pending':
      return document.kind === 'invoice' ? INVOICE_PENDING_TEXT : 'Ainda não disponível.';
    case 'expired':
      return 'Expirado.';
    default:
      return `Entregue em ${formatDate(document.createdAt)}`;
  }
}

function DocumentRow({
  document,
  appointment,
}: {
  document: DocumentMetadata;
  appointment: Appointment | null;
}) {
  const title = documentTitle(document, appointment);
  const status = statusText(document);
  const delivered = document.availability === 'mock_only' || document.availability === 'available';
  return (
    <View style={styles.row} accessible accessibilityLabel={`${title}. ${status}`}>
      <View style={styles.docIcon}>
        <SymbolView
          name={
            document.kind === 'invoice'
              ? { ios: 'doc.plaintext', android: 'receipt_long', web: 'receipt_long' }
              : { ios: 'doc.text', android: 'description', web: 'description' }
          }
          tintColor={Tokens.color.blue}
          size={22}
        />
      </View>
      <View style={styles.rowCopy}>
        <ThemedText type="smallBold" style={styles.rowTitle}>
          {title}
        </ThemedText>
        <ThemedText type="small" style={styles.muted}>
          {status}
        </ThemedText>
      </View>
      <SymbolView
        name={statusIcon[document.availability]}
        tintColor={delivered ? Tokens.color.brand : Tokens.color.muted}
        size={22}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  muted: {
    color: Tokens.color.muted,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 234, 253, 0.9)',
  },
  noticeText: {
    flex: 1,
    color: Tokens.color.brandDeep,
    fontSize: 13,
    lineHeight: 18,
  },
  group: {
    gap: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 6,
  },
  groupDate: {
    color: Tokens.color.blue,
    fontSize: 20,
    lineHeight: 26,
  },
  groupCard: {
    gap: 0,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  appointmentRow: {
    borderBottomWidth: 1,
    borderBottomColor: Tokens.color.border,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: Tokens.color.text,
  },
  docIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Tokens.color.surfaceMuted,
  },
});
