import { GlobalMetrics } from '@/domain/value-objects/GlobalMetrics.vo';
import { HistoryPoint } from '@/domain/value-objects/GlobalMetrics.vo';
import { SimulationConstants } from '@/domain/constants/SimulationConstants.constant';

export interface SimulationConfig {
  readonly speed:        number;
  readonly trafficLevel: number;
  readonly isChaosMode:  boolean;
  readonly isRunning:    boolean;
  readonly time:         number;
}

export interface SimulationSlice {
  simulationConfig: SimulationConfig;
  globalMetrics:    GlobalMetrics;
  history:          HistoryPoint[];

  _setSimulationConfig(partial: Partial<SimulationConfig>): void;
  _setGlobalMetrics(metrics: GlobalMetrics): void;
  _appendHistory(point: HistoryPoint): void;
  _clearHistory(): void;
}

const DEFAULT_CONFIG: SimulationConfig = {
  speed:        1,
  trafficLevel: 60,
  isChaosMode:  false,
  isRunning:    false,
  time:         0,
};

export function createSimulationSlice(
  set: (fn: (state: any) => Partial<any>) => void
): SimulationSlice {
  return {
    simulationConfig: DEFAULT_CONFIG,
    globalMetrics:    GlobalMetrics.zero(),
    history:          [],

    _setSimulationConfig(partial) {
      set(state => ({
        simulationConfig: { ...state.simulationConfig, ...partial },
      }));
    },

    _setGlobalMetrics(metrics) {
      set(() => ({ globalMetrics: metrics }));
    },

    _appendHistory(point) {
      set(state => ({
        history: [...state.history, point].slice(-SimulationConstants.MAX_HISTORY_POINTS),
      }));
    },

    _clearHistory() {
      set(() => ({ history: [] }));
    },
  };
}
