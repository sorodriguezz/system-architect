import { SimulationEvent } from '@/domain/entities/SimulationEvent.entity';

export interface EventLogSlice {
  events: SimulationEvent[];

  _appendEvent(event: SimulationEvent): void;
  _appendEvents(events: SimulationEvent[]): void;
  _clearEvents(): void;
}

export function createEventLogSlice(
  set: (fn: (state: any) => Partial<any>) => void
): EventLogSlice {
  return {
    events: [],

    _appendEvent(event) {
      set(state => ({
        events: [...state.events, event].slice(-SimulationEvent.MAX_EVENTS),
      }));
    },

    _appendEvents(newEvents) {
      if (newEvents.length === 0) return;
      set(state => ({
        events: [...state.events, ...newEvents].slice(-SimulationEvent.MAX_EVENTS),
      }));
    },

    _clearEvents() {
      set(() => ({ events: [] }));
    },
  };
}
