import { Appointment, CarePlan, MedicationPlan } from '@/contracts/platform';

// Dados fictícios para a demonstração: nenhum dado real de paciente. Na
// plataforma, a lista sai das últimas receitas validadas pelo médico
// (extraída com IA).

const lastCompleted = (appointments: Appointment[]) =>
  appointments.filter((item) => item.status === 'completed').at(-1) ?? null;

export function mockMedicationPlan(appointments: Appointment[]): MedicationPlan | null {
  const last = lastCompleted(appointments);
  if (!last) return null;
  const prescriptionId = `doc-prescription-${last.id}`;
  return {
    sources: [{ prescriptionId, issuedAt: last.startsAt, validatedBy: last.doctor.name }],
    medications: [
      {
        id: 'med-1',
        name: 'Sertralina 50 mg',
        dose: '1 comprimido',
        schedule: [{ period: 'morning', time: '08:00' }],
        asNeeded: false,
        instructions: 'Depois do café da manhã.',
        prescriptionId,
      },
      {
        id: 'med-2',
        name: 'Lamotrigina 50 mg',
        dose: '1 comprimido',
        schedule: [
          { period: 'morning', time: '08:00' },
          { period: 'evening', time: '20:00' },
        ],
        asNeeded: false,
        instructions: null,
        prescriptionId,
      },
      {
        id: 'med-3',
        name: 'Quetiapina 25 mg',
        dose: '1 comprimido',
        schedule: [{ period: 'bedtime', time: '22:00' }],
        asNeeded: false,
        instructions: 'Pode dar sono: evite dirigir depois de tomar.',
        prescriptionId,
      },
      {
        id: 'med-4',
        name: 'Hidroxizina 25 mg',
        dose: '1 comprimido',
        schedule: [],
        asNeeded: true,
        instructions: 'Em caso de ansiedade forte, no máximo 2 vezes ao dia.',
        prescriptionId,
      },
    ],
  };
}

export function mockCarePlan(appointments: Appointment[]): CarePlan | null {
  const last = lastCompleted(appointments);
  if (!last) return null;
  return {
    id: `doc-care-plan-${last.id}`,
    appointmentId: last.id,
    createdAt: last.startsAt,
    welcome:
      'Cada pequeno passo conta. Você não está sozinho nesse caminho, e estamos juntos até o próximo encontro.',
    sections: [
      {
        id: 'priorities',
        items: [
          'Tomar a sertralina **todas as manhãs**, depois do café.',
          'Começar a quetiapina **ao deitar**, como combinado.',
          'Manter horários parecidos para dormir e acordar.',
        ],
      },
      {
        id: 'treatment',
        items: [
          'O objetivo agora é melhorar o sono e diminuir a ansiedade ao longo do dia.',
          'Os efeitos da medicação costumam aparecer depois de algumas semanas.',
        ],
      },
      {
        id: 'watch',
        items: [
          'Como está o sono: horário em que dorme e se acorda à noite.',
          'Sono excessivo de manhã ou tontura ao levantar.',
          'Mudanças de humor ao longo da semana. Use o **diário de humor**.',
        ],
      },
      {
        id: 'guidance',
        items: [
          'Uma caminhada leve de 30 minutos, 3 vezes por semana.',
          'Evitar o celular na última hora antes de dormir.',
        ],
      },
      {
        id: 'contact',
        items: [
          'Efeito da medicação que atrapalhe o dia a dia.',
          'Piora importante do humor ou da ansiedade.',
          'Em emergência, **ligue 188 (CVV)** ou **192 (SAMU)**, a qualquer hora.',
        ],
      },
      {
        id: 'next',
        items: [
          'Retorno em cerca de 15 dias. A data aparece em **Consultas**.',
          'Responder os questionários antes do retorno.',
        ],
      },
    ],
  };
}
