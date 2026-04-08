'use client';
import { useArchitectureStore } from '@/infrastructure/store/architecture.store';
import { NodeEntity } from '@/domain/entities/Node.entity';
import { EdgeEntity } from '@/domain/entities/Edge.entity';

/**
 * useSelectedNode — resolves the currently selected entity (node or edge).
 * Returns a discriminated union so callers can pattern-match cleanly.
 */
export type SelectionState =
  | { kind: 'none' }
  | { kind: 'node'; entity: NodeEntity }
  | { kind: 'edge'; entity: EdgeEntity };

export function useSelectedNode(): SelectionState {
  const selectedNodeId = useArchitectureStore(s => s.selectedNodeId);
  const selectedEdgeId = useArchitectureStore(s => s.selectedEdgeId);
  const nodes          = useArchitectureStore(s => s.nodes);
  const edges          = useArchitectureStore(s => s.edges);

  if (selectedNodeId) {
    const entity = nodes.find(n => n.id === selectedNodeId);
    if (entity) return { kind: 'node', entity };
  }

  if (selectedEdgeId) {
    const entity = edges.find(e => e.id === selectedEdgeId);
    if (entity) return { kind: 'edge', entity };
  }

  return { kind: 'none' };
}
