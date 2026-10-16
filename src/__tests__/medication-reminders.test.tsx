/// <reference types="jest" />

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { MedicationReminderCard } from '@/components/care/medication-reminder-card';
import { mockMedicationPlan } from '@/mocks/care';
import { mockAppointments } from '@/mocks/patient-app-gateway';
import {
  ENABLED_KEY,
  handleTakenResponse,
  setMedicationReminders,
  syncMedicationReminders,
  TAKEN_ACTION,
} from '@/services/medication-reminders';
import { createMemoryStore } from '@/services/storage';
import { reminderSchedule, reminderTimes } from '@/utils/medication-reminders';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6 },
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily' },
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationCategoryAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  dismissNotificationAsync: jest.fn(async () => undefined),
}));
jest.mock('@react-native-async-storage/async-storage', () => {
  const data = new Map<string, string>();
  return {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => void data.set(key, value),
    removeItem: async (key: string) => void data.delete(key),
  };
});

const mocked = jest.mocked(Notifications);
const now = new Date(2026, 9, 16, 9, 0);
const plan = mockMedicationPlan(mockAppointments(now))!;
const requests = () => mocked.scheduleNotificationAsync.mock.calls.map(([request]) => request);
const ids = () => requests().map((request) => request.identifier);

beforeEach(() => jest.clearAllMocks());

describe('horários do lembrete', () => {
  it('saem da receita, sem repetir e sem os de "se precisar"', () => {
    expect(reminderTimes(plan)).toEqual(['08:00', '20:00', '22:00']);
    expect(reminderTimes(null)).toEqual([]);
  });

  it('segundo aviso 30 minutos depois, nos próximos 3 dias, menos o que passou e o respondido', () => {
    const { daily, followUps } = reminderSchedule(
      ['08:00', '20:00'],
      now,
      new Set(['med.followup.2026-10-16.20:00'])
    );
    expect(daily).toEqual([
      { id: 'med.daily.08:00', time: '08:00', hour: 8, minute: 0 },
      { id: 'med.daily.20:00', time: '20:00', hour: 20, minute: 0 },
    ]);
    expect(followUps.map((item) => [item.id, item.date])).toEqual([
      // Hoje: o das 08:30 já passou e o das 20:30 foi respondido.
      ['med.followup.2026-10-17.08:00', new Date(2026, 9, 17, 8, 30)],
      ['med.followup.2026-10-17.20:00', new Date(2026, 9, 17, 20, 30)],
      ['med.followup.2026-10-18.08:00', new Date(2026, 9, 18, 8, 30)],
      ['med.followup.2026-10-18.20:00', new Date(2026, 9, 18, 20, 30)],
    ]);
  });
});

describe('lembrete dos remédios', () => {
  it('ao aceitar, agenda um aviso diário por horário, sem o nome dos remédios', async () => {
    const store = createMemoryStore();
    mocked.getPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      canAskAgain: true,
    } as never);

    expect(await setMedicationReminders(true, plan, now, store)).toBe('on');

    expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(await store.getItem(ENABLED_KEY)).toBe('on');
    const daily = requests().filter((request) => request.identifier?.startsWith('med.daily'));
    expect(daily).toHaveLength(3);
    expect(daily[0]).toEqual({
      identifier: 'med.daily.08:00',
      content: expect.objectContaining({
        body: 'Hora dos seus remédios das 08:00.',
        categoryIdentifier: 'medicacao',
        data: { screen: 'medicacoes', kind: 'medication', time: '08:00', followUp: false },
      }),
      trigger: expect.objectContaining({ type: 'daily', hour: 8, minute: 0 }),
    });
    for (const request of requests()) {
      expect(request.content.body).not.toMatch(/Sertralina|Lamotrigina|Quetiapina|Hidroxizina/);
    }
    // O botão "Já tomei" responde sem abrir o app.
    expect(mocked.setNotificationCategoryAsync).toHaveBeenCalledWith('medicacao', [
      {
        identifier: TAKEN_ACTION,
        buttonTitle: 'Já tomei',
        options: { opensAppToForeground: false },
      },
    ]);
  });

  it('sem permissão, não liga nem agenda', async () => {
    const store = createMemoryStore();
    mocked.getPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      canAskAgain: true,
    } as never);
    mocked.requestPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);

    expect(await setMedicationReminders(true, plan, now, store)).toBe('denied');

    expect(await store.getItem(ENABLED_KEY)).toBeNull();
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('refaz só os avisos dos remédios; desligado, só cancela', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'med.daily.07:00' },
      { identifier: 'lembrete-humor' },
    ] as never);

    await syncMedicationReminders(plan, now, createMemoryStore());

    expect(mocked.cancelScheduledNotificationAsync.mock.calls).toEqual([['med.daily.07:00']]);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  });

  it('"Já tomei" fecha o aviso e cancela o segundo aviso daquele horário, de vez', async () => {
    const store = createMemoryStore({ [ENABLED_KEY]: 'on' });
    const response = (identifier: string, followUp: boolean) =>
      ({
        actionIdentifier: TAKEN_ACTION,
        notification: {
          date: new Date(2026, 9, 16, 8, 0).getTime(),
          request: {
            identifier,
            content: { data: { kind: 'medication', time: '08:00', followUp } },
          },
        },
      }) as never;

    await handleTakenResponse(response('med.daily.08:00', false), store);

    expect(mocked.dismissNotificationAsync).toHaveBeenCalledWith('med.daily.08:00');
    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'med.followup.2026-10-16.08:00'
    );

    // Ao abrir o app, o segundo aviso respondido não volta.
    await syncMedicationReminders(plan, new Date(2026, 9, 16, 8, 5), store);
    expect(ids()).not.toContain('med.followup.2026-10-16.08:00');
    expect(ids()).toContain('med.followup.2026-10-17.08:00');

    // No segundo aviso, "Já tomei" só fecha.
    jest.clearAllMocks();
    await handleTakenResponse(response('med.followup.2026-10-16.08:00', true), store);
    expect(mocked.dismissNotificationAsync).toHaveBeenCalledWith('med.followup.2026-10-16.08:00');
    expect(mocked.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('cartão do lembrete em Minhas medicações', () => {
  it('sugere os horários da receita e liga com um toque', async () => {
    await render(<MedicationReminderCard plan={plan} />);

    expect(
      await screen.findByText(/^Um aviso às 08:00, 20:00 e 22:00, nos horários da sua receita\./)
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ativar lembretes' }));

    expect(await screen.findByText('Lembretes ativos')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Desativar lembretes' })).toBeOnTheScreen();
  });
});
