import { createContext, ReactNode, useContext } from 'react';

import { PatientAppGateway } from '@/contracts/platform';
import { mockPatientAppGateway } from '@/mocks/patient-app-gateway';

// Ponto único de composição: as telas falam só com a interface
// PatientAppGateway. Hoje a implementação padrão é o mock local; uma API
// real entra aqui, sem mudar as telas.
const PatientAppGatewayContext = createContext<PatientAppGateway>(mockPatientAppGateway);

type ProviderProps = {
  gateway?: PatientAppGateway;
  children: ReactNode;
};

export function PatientAppGatewayProvider({
  gateway = mockPatientAppGateway,
  children,
}: ProviderProps) {
  return (
    <PatientAppGatewayContext.Provider value={gateway}>{children}</PatientAppGatewayContext.Provider>
  );
}

export function usePatientAppGateway() {
  return useContext(PatientAppGatewayContext);
}
