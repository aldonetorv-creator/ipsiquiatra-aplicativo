import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GradientButton } from '@/components/ui/gradient-button';
import { OutlineButton } from '@/components/ui/outline-button';
import { Tokens } from '@/constants/theme';
import { BookingPath } from '@/contracts/patricia';
import { PatriciaCardAction, PatriciaCardOutcome } from '@/contracts/platform';
import { ageFrom, isoDate, maskCpf, maskDate, maskPhone, maskTime } from '@/utils/patient-data';

export type PatriciaForm =
  | { kind: 'booking'; path: BookingPath; when: string }
  | { kind: 'identify'; action: 'cancelar' | 'remarcar' }
  | { kind: 'report' };

type Props = {
  // null: fechado.
  form: PatriciaForm | null;
  // Envia o cartão; devolve o resultado ou a mensagem de erro.
  onSubmit: (action: PatriciaCardAction) => Promise<PatriciaCardOutcome | string>;
  onClose: () => void;
};

// Os dados dos cartões da Patrícia (CPF, nascimento, celular) são digitados
// numa janela própria, fora da lista invertida da conversa, onde o celular
// atrapalhava a digitação (como no diário de humor). Eles vão direto para o
// servidor da clínica e não ficam salvos no aparelho.
export function PatriciaFormSheet({ form, onSubmit, onClose }: Props) {
  return (
    <Modal visible={form !== null} transparent animationType="slide" onRequestClose={onClose}>
      {form ? <Sheet form={form} onSubmit={onSubmit} onClose={onClose} /> : null}
    </Modal>
  );
}

type Values = Record<string, string>;

const titles = {
  booking: 'Confirmar consulta',
  identify: 'Identificação',
  report: 'Relato para o médico',
};

function Sheet({ form, onSubmit, onClose }: { form: PatriciaForm } & Omit<Props, 'form'>) {
  const [values, setValues] = useState<Values>({});
  const [noCpf, setNoCpf] = useState(false);
  const [path, setPath] = useState<BookingPath>(form.kind === 'booking' ? form.path : 'primeira');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [offerNewRecord, setOfferNewRecord] = useState(false);
  const [sending, setSending] = useState(false);

  const set = (key: string, mask?: (value: string) => string) => (value: string) => {
    setValues((current) => ({ ...current, [key]: mask ? mask(value) : value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };
  const value = (key: string) => values[key] ?? '';

  const returning = form.kind === 'booking' && path === 'paciente';
  const age = ageFrom(value('birthDate'));
  const minor = form.kind === 'booking' && !returning && age !== null && age < 18;

  const action = (): PatriciaCardAction => {
    if (form.kind === 'report') {
      return {
        type: 'report',
        data: { name: value('name'), phone: value('phone'), text: value('text') },
      };
    }
    if (form.kind === 'identify') {
      return {
        type: 'identify',
        data: {
          noCpf,
          cpf: value('cpf'),
          name: value('name'),
          birthDate: isoDate(value('birthDate')),
          date: isoDate(value('date')),
          time: value('time'),
        },
      };
    }
    return returning
      ? {
          type: 'confirm_booking',
          declared: 'paciente',
          data: {
            cpf: value('cpf'),
            birthDate: isoDate(value('birthDate')),
            phone: value('phone'),
          },
        }
      : {
          type: 'confirm_booking',
          declared: 'primeira',
          data: {
            name: value('name'),
            phone: value('phone'),
            noCpf,
            cpf: value('cpf'),
            birthDate: isoDate(value('birthDate')),
            responsibleName: value('responsibleName'),
            responsibleCpf: value('responsibleCpf'),
          },
        };
  };

  const submit = async () => {
    setSending(true);
    setNotice(null);
    const result = await onSubmit(action());
    setSending(false);
    if (typeof result === 'string') {
      setNotice(result);
      return;
    }
    if (result.fieldErrors || result.notice || result.offerNewRecord) {
      setErrors(result.fieldErrors ?? {});
      setNotice(result.notice ?? null);
      setOfferNewRecord(Boolean(result.offerNewRecord));
      return;
    }
    // O cartão terminou: a resposta da Patrícia aparece na conversa.
    onClose();
  };

  const field = (
    key: string,
    label: string,
    props: TextInputProps = {},
    mask?: (v: string) => string
  ) => (
    <Field
      key={key}
      label={label}
      value={value(key)}
      onChangeText={set(key, mask)}
      error={errors[key]}
      {...props}
    />
  );
  const cpfFields = (
    <>
      {noCpf
        ? null
        : field(
            'cpf',
            'CPF',
            { keyboardType: 'number-pad', placeholder: '000.000.000-00' },
            maskCpf
          )}
      {returning ? null : <Check label="Não tenho CPF" value={noCpf} onChange={setNoCpf} />}
    </>
  );
  const birth = field(
    'birthDate',
    'Data de nascimento',
    { keyboardType: 'number-pad', placeholder: 'DD/MM/AAAA' },
    maskDate
  );

  let intro = '';
  let body = null;
  let submitLabel = 'Enviar';
  if (form.kind === 'booking') {
    intro = returning
      ? 'Para localizar o seu cadastro, informe o CPF e a data de nascimento.'
      : 'Para concluir seu cadastro, preencha os campos a seguir com seus dados.';
    submitLabel = 'Confirmar consulta';
    body = (
      <>
        {returning
          ? null
          : field('name', 'Nome completo', {
              placeholder: 'Nome e sobrenome',
              autoComplete: 'name',
            })}
        {cpfFields}
        {birth}
        {field(
          'phone',
          returning ? 'Celular com DDD (opcional)' : 'Celular com DDD (para os avisos por SMS)',
          { keyboardType: 'phone-pad', placeholder: '(19) 99999-9999' },
          maskPhone
        )}
        {minor ? (
          <>
            <ThemedText type="small" style={styles.muted}>
              Para menores de 18 anos, precisamos dos dados de quem é responsável pelo paciente.
            </ThemedText>
            {field('responsibleName', 'Nome completo do responsável', {
              placeholder: 'Nome e sobrenome',
            })}
            {field(
              'responsibleCpf',
              'CPF do responsável',
              { keyboardType: 'number-pad', placeholder: '000.000.000-00' },
              maskCpf
            )}
          </>
        ) : null}
      </>
    );
  } else if (form.kind === 'identify') {
    intro = 'Para a sua segurança, confirme os seus dados e informe qual consulta você quer mudar.';
    submitLabel = 'Continuar';
    body = (
      <>
        {cpfFields}
        {noCpf ? (
          <>
            {field('name', 'Nome completo', { placeholder: 'Nome e sobrenome' })}
            {birth}
          </>
        ) : null}
        {field(
          'date',
          'Dia da consulta',
          { keyboardType: 'number-pad', placeholder: 'DD/MM/AAAA' },
          maskDate
        )}
        {field(
          'time',
          'Horário da consulta',
          { keyboardType: 'number-pad', placeholder: 'HH:MM' },
          maskTime
        )}
      </>
    );
  } else {
    intro = 'Escreva o motivo da consulta ou o que gostaria de contar ao médico.';
    submitLabel = 'Enviar para a clínica';
    body = (
      <>
        {field('name', 'Seu nome', { autoComplete: 'name' })}
        {field(
          'phone',
          'Celular com DDD (para a clínica responder)',
          { keyboardType: 'phone-pad', placeholder: '(19) 99999-9999' },
          maskPhone
        )}
        {field('text', 'O que você quer contar ao médico', { multiline: true, maxLength: 4000 })}
      </>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.backdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fechar sem enviar"
      />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="smallBold" style={styles.title}>
            {titles[form.kind]}
          </ThemedText>
          {form.kind === 'booking' ? (
            <ThemedText type="small" style={styles.muted}>
              {form.when}
            </ThemedText>
          ) : null}
          <ThemedText type="small" style={styles.muted}>
            {intro}
          </ThemedText>
          {body}
          {notice ? (
            <ThemedText type="small" style={styles.notice} accessibilityRole="alert">
              {notice}
            </ThemedText>
          ) : null}
          <ThemedText type="small" style={styles.privacy}>
            {form.kind === 'report'
              ? 'Este texto não é enviado à inteligência artificial. A equipe da clínica lê e entra em contato.'
              : 'Estes dados vão direto para o cadastro da clínica. Não são enviados à inteligência artificial e não ficam salvos neste celular.'}
          </ThemedText>
          <GradientButton label={submitLabel} chevron={false} disabled={sending} onPress={submit} />
          {offerNewRecord && returning ? (
            <OutlineButton
              label="Abrir um cadastro novo"
              onPress={() => {
                setPath('primeira');
                setOfferNewRecord(false);
                setNotice(null);
              }}
            />
          ) : null}
          <OutlineButton label="Cancelar" onPress={onClose} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={Tokens.color.muted}
        style={[
          styles.input,
          props.multiline && styles.multiline,
          error ? styles.inputError : null,
        ]}
        {...props}
      />
      {error ? (
        <ThemedText type="small" style={styles.error} accessibilityRole="alert">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.check}>
      <View style={[styles.box, value && styles.boxOn]}>
        {value ? (
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            tintColor={Tokens.color.onBrand}
            size={14}
          />
        ) : null}
      </View>
      <ThemedText type="small" style={styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(22, 16, 48, 0.45)',
  },
  sheet: {
    maxHeight: '90%',
    paddingTop: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Tokens.color.surface,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Tokens.color.border,
  },
  content: {
    gap: 12,
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    color: Tokens.color.brand,
    fontSize: 18,
    lineHeight: 24,
  },
  muted: {
    color: Tokens.color.muted,
  },
  field: {
    gap: 6,
  },
  label: {
    color: Tokens.color.text,
  },
  input: {
    borderWidth: 1,
    borderColor: Tokens.color.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: Tokens.color.text,
    backgroundColor: Tokens.color.background,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: Tokens.color.brandDeep,
  },
  error: {
    color: Tokens.color.brandDeep,
  },
  notice: {
    color: Tokens.color.brandDeep,
  },
  privacy: {
    color: Tokens.color.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Tokens.color.brandBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: {
    backgroundColor: Tokens.color.brand,
    borderColor: Tokens.color.brand,
  },
});
