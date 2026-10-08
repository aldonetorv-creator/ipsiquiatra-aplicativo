import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext } from 'react';

import { PatientAppGateway } from '@/contracts/platform';
import { createMockPatientAppGateway } from '@/mocks/patient-app-gateway';

// Ponto único de composição: as telas falam só com a interface
// PatientAppGateway. Hoje a implementação padrão é o mock local; uma API
// real entra aqui, sem mudar as telas.
//
// O histórico (conversa e humor) fica salvo só neste aparelho, via AsyncStorage
// (na web, localStorage). Antes de pacientes reais: criptografia e
// consentimento (LGPD, dado sensível de saúde) — ver docs/dependencias.md.
const defaultGateway = createMockPatientAppGateway({ store: AsyncStorage });

const PatientAppGatewayContext = createContext<PatientAppGateway>(defaultGateway);

type ProviderProps = {
  gateway?: PatientAppGateway;
  children: ReactNode;
};

export function PatientAppGatewayProvider({
  gateway = defaultGateway,
  children,
}: ProviderProps) {
  return (
    <PatientAppGatewayContext.Provider value={gateway}>{children}</PatientAppGatewayContext.Provider>
  );
}

export function usePatientAppGateway() {
  return useContext(PatientAppGatewayContext);
}
