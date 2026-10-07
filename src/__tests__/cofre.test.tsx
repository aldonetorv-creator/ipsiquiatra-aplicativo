/// <reference types="jest" />

import { render, screen } from '@testing-library/react-native';

import CofreScreen from '@/app/cofre';
import { PatientAppGateway } from '@/contracts/platform';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';

async function renderWith(gateway: PatientAppGateway) {
  return render(
    <PatientAppGatewayProvider gateway={gateway}>
      <CofreScreen />
    </PatientAppGatewayProvider>
  );
}

const consent: PatientAppGateway['readConsent'] = async () => ({
  ok: true,
  requestId: 'test',
  data: { policyVersion: 'test', acceptedAt: null, status: 'not_requested' },
});

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

    await renderWith({ listDocuments, readConsent: consent });

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
      readConsent: consent,
    });

    expect(await screen.findByText('Documentos indisponíveis no momento.')).toBeOnTheScreen();
  });

  it('mostra estado vazio quando não há documentos', async () => {
    await renderWith({
      listDocuments: async () => ({ ok: true, requestId: 'test', data: [] }),
      readConsent: consent,
    });

    expect(await screen.findByText('Nenhum documento por aqui ainda.')).toBeOnTheScreen();
  });
});
