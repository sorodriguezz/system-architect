import { EdgeEntity, CreateEdgeParams } from '@/domain/entities/Edge.entity';

/**
 * EdgesSlice — manages the collection of edge entities within Zustand.
 */
export interface EdgesSlice {
  edges: EdgeEntity[];
  selectedEdgeId: string | null;

  _addEdge(params: CreateEdgeParams): void;
  _updateEdge(id: string, partial: Partial<Omit<EdgeEntity, 'id' | 'sourceId' | 'targetId'>>): void;
  _removeEdge(id: string): void;
  _replaceAllEdges(edges: EdgeEntity[]): void;
  _setSelectedEdgeId(id: string | null): void;
}

export function createEdgesSlice(
  set: (fn: (state: any) => Partial<any>) => void
): EdgesSlice {
  return {
    edges: [],
    selectedEdgeId: null,

    _addEdge(params) {
      const edge = EdgeEntity.create(params);
      set(state => ({ edges: [...state.edges, edge] }));
    },

    _updateEdge(id, partial) {
      set(state => ({
        edges: state.edges.map((e: EdgeEntity) =>
          e.id === id ? EdgeEntity.update(e, partial) : e
        ),
      }));
    },

    _removeEdge(id) {
      set(state => ({
        edges: state.edges.filter((e: EdgeEntity) => e.id !== id),
        selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
      }));
    },

    _replaceAllEdges(edges) {
      set(() => ({ edges }));
    },

    _setSelectedEdgeId(id) {
      set(() => ({ selectedEdgeId: id, selectedNodeId: null }));
    },
  };
}
