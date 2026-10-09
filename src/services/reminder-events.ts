// Avisa quem agenda as notificações que o paciente mudou o lembrete (ou
// registrou o humor), sem as telas precisarem conhecer o módulo de notificação.
type Listener = () => void;

const listeners = new Set<Listener>();

export function onReminderChange(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyReminderChange() {
  listeners.forEach((listener) => listener());
}
