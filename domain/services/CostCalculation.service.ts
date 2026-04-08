import { NodeEntity } from '../entities/Node.entity';
import { SimulationConstants } from '../constants/SimulationConstants.constant';

/**
 * CostCalculationService — pure domain service.
 *
 * Computes the infrastructure cost of an architecture.
 * All pricing data is driven by SimulationConstants so rates can
 * be updated in one place without touching business logic.
 */

const HOURS_PER_MONTH = 24 * 30;

export function computeCostPerHour(nodes: NodeEntity[]): number {
  return nodes.reduce((total, node) => {
    const baseRate = SimulationConstants.COST_PER_HOUR_BY_TYPE[node.type] ?? 0;
    return total + baseRate * node.config.replicas;
  }, 0);
}

export function computeCostPerMonth(nodes: NodeEntity[]): number {
  return computeCostPerHour(nodes) * HOURS_PER_MONTH;
}
