import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext } from 'react';

import { patriciaSlug, platformUrl } from '@/config/platform';
import { PatientAppGateway } from '@/contracts/platform';
import { createMockPatientAppGateway } from '@/mocks/patient-app-gateway';
import { createPatriciaHttpApi } from '@/services/patricia-api';

// Ponto único de composição: as telas falam só com a interface
// PatientAppGateway. Hoje a implementação padrão é o mock local, com a
// Patrícia real quando o app sabe o endereço dela (config/platform.ts); o
// resto da plataforma entra aqui na fase 2, sem mudar as telas.
//
// O histórico (conversa e humor) fica salvo só neste aparelho, via AsyncStorage
// (na web, localStorage). O termo da Patrícia diz isso ao paciente; os dados
// dos cartões (CPF, nascimento, celular) vão direto à plataforma.
const defaultGateway = createMockPatientAppGateway({
  store: AsyncStorage,
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
