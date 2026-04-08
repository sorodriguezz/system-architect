'use client';
import { useArchitectureStore } from '@/infrastructure/store/architecture.store';

/**
 * useSimulationControls — exposes only simulation-related actions.
 *
 * Separating concerns at the hook level means components only
 * subscribe to the slices of state they actually need, reducing
 * unnecessary re-renders.
 */
export function useSimulationControls() {
  const simulationConfig     = useArchitectureStore(s => s.simulationConfig);
  const globalMetrics        = useArchitectureStore(s => s.globalMetrics);
  const history              = useArchitectureStore(s => s.history);
  const startSimulation      = useArchitectureStore(s => s.startSimulation);
  const stopSimulation       = useArchitectureStore(s => s.stopSimulation);
  const resetSimulation      = useArchitectureStore(s => s.resetSimulation);
  const setSpeed             = useArchitectureStore(s => s.setSpeed);
  const setTrafficLevel      = useArchitectureStore(s => s.setTrafficLevel);
  const toggleChaosMode      = useArchitectureStore(s => s.toggleChaosMode);

  return {
    simulationConfig,
    globalMetrics,
    history,
    isRunning: simulationConfig.isRunning,
    speed:     simulationConfig.speed,
    traffic:   simulationConfig.trafficLevel,
    isChaos:   simulationConfig.isChaosMode,
    startSimulation,
    stopSimulation,
    resetSimulation,
    setSpeed,
    setTrafficLevel,
    toggleChaosMode,
  };
}
