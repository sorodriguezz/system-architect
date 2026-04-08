import { IArchitectureRepository } from '@/domain/repositories/IArchitectureRepository';
import { NodeEntity } from '@/domain/entities/Node.entity';

/**
 * ChaosNode use cases — apply chaos engineering actions to individual nodes.
 *
 * Each function is a focused command with no return value.
 * The repository mutation triggers reactive UI updates downstream.
 */

export function killNode(
  repository: IArchitectureRepository,
  nodeId: string
): void {
  const node = repository.getNodeById(nodeId);
  if (!node) return;
  const killed = NodeEntity.kill(node);
  repository.updateNode(nodeId, {
    status:       killed.status,
    isChaosActive:killed.isChaosActive,
    metrics:      killed.metrics,
  });
}

export function restoreNode(
  repository: IArchitectureRepository,
  nodeId: string
): void {
  const node = repository.getNodeById(nodeId);
  if (!node) return;
  const restored = NodeEntity.restore(node);
  repository.updateNode(nodeId, {
    status:       restored.status,
    isChaosActive:restored.isChaosActive,
  });
}

export function overloadNode(
  repository: IArchitectureRepository,
  nodeId: string
): void {
  const node = repository.getNodeById(nodeId);
  if (!node) return;
  const overloaded = NodeEntity.overload(node);
  repository.updateNode(nodeId, {
    status:       overloaded.status,
    isChaosActive:overloaded.isChaosActive,
    metrics:      overloaded.metrics,
  });
}

export function duplicateNode(
  repository: IArchitectureRepository,
  nodeId: string
): void {
  const node = repository.getNodeById(nodeId);
  if (!node) return;

  repository.addNode(node.type, `${node.label} (copy)`, {
    x: node.position.x + 50,
    y: node.position.y + 50,
  });

  // Apply the same config overrides to the newly created node
  const allNodes = repository.getAllNodes();
  const duplicate = allNodes[allNodes.length - 1];
  if (duplicate) {
    repository.updateNodeConfig(duplicate.id, node.config);
  }
}
