import { NodeEntity, Position } from '@/domain/entities/Node.entity';
import { NodeType } from '@/domain/constants/NodeTypes.constant';
import { NodeConfig } from '@/domain/value-objects/NodeConfig.vo';

/**
 * NodesSlice — manages the collection of node entities within Zustand.
 *
 * All mutations return the full next state (Zustand pattern).
 * Direct array mutation is intentionally avoided — every write produces a new array.
 */
export interface NodesSlice {
  nodes: NodeEntity[];
  selectedNodeId: string | null;

  // ── IArchitectureRepository conformance ──────────────────────────────────────
  _addNode(type: NodeType, label: string, position: Position): void;
  _updateNode(id: string, partial: Partial<Omit<NodeEntity, 'id' | 'type'>>): void;
  _updateNodeConfig(id: string, partial: Partial<NodeConfig>): void;
  _removeNode(id: string): void;
  _replaceAllNodes(nodes: NodeEntity[]): void;
  _setSelectedNodeId(id: string | null): void;
}

export function createNodesSlice(
  set: (fn: (state: any) => Partial<any>) => void
): NodesSlice {
  return {
    nodes: [],
    selectedNodeId: null,

    _addNode(type, label, position) {
      const node = NodeEntity.create(type, label, position);
      set(state => ({ nodes: [...state.nodes, node] }));
    },

    _updateNode(id, partial) {
      set(state => ({
        nodes: state.nodes.map((n: NodeEntity) =>
          n.id === id ? NodeEntity.update(n, partial) : n
        ),
      }));
    },

    _updateNodeConfig(id, partial) {
      set(state => ({
        nodes: state.nodes.map((n: NodeEntity) =>
          n.id === id
            ? NodeEntity.update(n, { config: NodeConfig.update(n.config, partial) })
            : n
        ),
      }));
    },

    _removeNode(id) {
      set(state => ({
        nodes: state.nodes.filter((n: NodeEntity) => n.id !== id),
        // Cascade: also remove edges connected to this node
        edges: state.edges.filter(
          (e: any) => e.sourceId !== id && e.targetId !== id
        ),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      }));
    },

    _replaceAllNodes(nodes) {
      set(() => ({ nodes }));
    },

    _setSelectedNodeId(id) {
      set(() => ({ selectedNodeId: id, selectedEdgeId: null }));
    },
  };
}
