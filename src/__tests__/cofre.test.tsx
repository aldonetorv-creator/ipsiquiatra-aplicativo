/// <reference types="jest" />

import { render, screen } from '@testing-library/react-native';

import CofreScreen from '@/app/cofre';
import { PatientAppGateway } from '@/contracts/platform';
import { createMockPatientAppGateway } from '@/mocks/patient-app-gateway';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';

// Parte do mock completo e troca só o que cada teste controla.
async function renderWith(overrides: Partial<PatientAppGateway>) {
  const gateway = { ...createMockPatientAppGateway(), ...overrides };
  return render(
    <PatientAppGatewayProvider gateway={gateway}>
      <CofreScreen />
    </PatientAppGatewayProvider>
  );
}

describe('Cofre', () => {
  it('mostra os documentos vindos do gateway injetado', async () => {
    const listDocuments = jest.fn<ReturnType<PatientAppGateway['listDocuments']>, []>(
      async () => ({
        ok: true,
        requestId: 'test',
        data: [
          {
            id: 'doc-1',
            displayName: 'Documento de teste',
            kind: 'receipt',
            createdAt: '2026-03-09',
            availability: 'available',
          },
        ],
      })
    );

    await renderWith({ listDocuments });

    expect(await screen.findByText('Documento de teste')).toBeOnTheScreen();
    expect(screen.getByText('Recibo · 09/03/2026')).toBeOnTheScreen();
    expect(screen.getByText('Disponível')).toBeOnTheScreen();
    expect(listDocuments).toHaveBeenCalledTimes(1);
  });

  it('mostra a mensagem de erro do contrato', async () => {
    await renderWith({
      listDocuments: async () => ({
        ok: false,
        requestId: 'test',
        error: { code: 'not_available', message: 'Documentos indisponíveis no momento.' },
      }),
    });

    expect(await screen.findByText('Documentos indisponíveis no momento.')).toBeOnTheScreen();
  });

  it('mostra estado vazio quando não há documentos', async () => {
    await renderWith({
      listDocuments: async () => ({ ok: true, requestId: 'test', data: [] }),
    });

    expect(await screen.findByText('Nenhum documento por aqui ainda.')).toBeOnTheScreen();
  });
});
