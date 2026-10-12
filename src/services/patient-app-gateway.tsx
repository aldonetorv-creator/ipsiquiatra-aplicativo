import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext } from 'react';

import { patriciaSlug, platformUrl } from '@/config/platform';
import { PatientAppGateway } from '@/contracts/platform';
import { createMockPatientAppGateway } from '@/mocks/patient-app-gateway';
import { createDeviceCipher } from '@/services/device-cipher';
import { createEncryptedStore } from '@/services/encrypted-store';
import { createPatriciaHttpApi } from '@/services/patricia-api';

// Ponto único de composição: as telas falam só com a interface
// PatientAppGateway. Hoje a implementação padrão é o mock local, com a
// Patrícia real quando o app sabe o endereço dela (config/platform.ts); o
// resto da plataforma entra aqui na fase 2, sem mudar as telas.
//
// O histórico (conversa, humor, questionários e aceite do termo) fica salvo só
// neste aparelho, via AsyncStorage, cifrado com uma chave guardada no
// armazenamento seguro do celular (services/device-cipher.ts). Na web
// (localStorage), fica sem cifra. O termo da Patrícia diz ao paciente que a
// conversa fica no celular; os dados dos cartões (CPF, nascimento, celular) vão
// direto à plataforma.
const defaultGateway = createMockPatientAppGateway({
  store: createEncryptedStore(AsyncStorage, createDeviceCipher()),
  patricia: patriciaSlug
    ? createPatriciaHttpApi({ baseUrl: platformUrl, slug: patriciaSlug })
    : undefined,
});

const PatientAppGatewayContext = createContext<PatientAppGateway>(defaultGateway);

type ProviderProps = {
  gateway?: PatientAppGateway;
  children: ReactNode;
};

export function PatientAppGatewayProvider({ gateway = defaultGateway, children }: ProviderProps) {
  return (
    <PatientAppGatewayContext.Provider value={gateway}>
      {children}
    </PatientAppGatewayContext.Provider>
  );
}

export function usePatientAppGateway() {
  return useContext(PatientAppGatewayContext);
}
