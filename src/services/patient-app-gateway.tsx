import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext } from 'react';

import { patientAppMode, patriciaSlug, platformUrl } from '@/config/platform';
import { PatientAppGateway } from '@/contracts/platform';
import { createMockPatientAppGateway } from '@/mocks/patient-app-gateway';
import { createDeviceCipher } from '@/services/device-cipher';
import { createEncryptedStore } from '@/services/encrypted-store';
import { createPlatformPatientAppGateway } from '@/services/patient-app-gateway-http';
import { createPatriciaHttpApi } from '@/services/patricia-api';
import { patientSessionLink } from '@/services/session-link';

// Ponto único de composição: as telas falam só com a interface
// PatientAppGateway. No modo 'real' (config/platform.ts), consultas,
// documentos, medicações e plano vêm da plataforma, com o token do login
// (services/patient-app-gateway-http.ts); no modo 'demo', são os de exemplo.
// A conversa, o humor e os questionários continuam no gateway local, com a
// Patrícia real quando o app sabe o endereço dela.
//
// O histórico (conversa, humor, questionários e aceite do termo) fica salvo só
// neste aparelho, via AsyncStorage, cifrado com uma chave guardada no
// armazenamento seguro do celular (services/device-cipher.ts). Na web
// (localStorage), fica sem cifra. O termo da Patrícia diz ao paciente que a
// conversa fica no celular; os dados dos cartões (CPF, nascimento, celular) vão
// direto à plataforma.
const localGateway = createMockPatientAppGateway({
  store: createEncryptedStore(AsyncStorage, createDeviceCipher()),
  patricia: patriciaSlug
    ? createPatriciaHttpApi({ baseUrl: platformUrl, slug: patriciaSlug })
    : undefined,
});
const defaultGateway =
  patientAppMode === 'real'
    ? createPlatformPatientAppGateway({
        baseUrl: platformUrl,
        slug: patriciaSlug,
        session: patientSessionLink,
        local: localGateway,
      })
    : localGateway;

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
