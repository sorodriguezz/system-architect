import { IArchitectureRepository } from '@/domain/repositories/IArchitectureRepository';

/**
 * RemoveNodeUseCase — removes a node and all its connected edges.
 *
 * The repository is responsible for edge cascade deletion
 * (nodes and edges are co-owned by the architecture aggregate).
 */
export function removeNode(
  repository: IArchitectureRepository,
  nodeId: string
): void {
  repository.removeNode(nodeId);

  if (repository.getSelectedNodeId() === nodeId) {
    repository.setSelectedNodeId(null);
  }
}
