import { NodeEntity, Position } from '../entities/Node.entity';
import { EdgeEntity, CreateEdgeParams } from '../entities/Edge.entity';
import { NodeType } from '../constants/NodeTypes.constant';
import { NodeConfig } from '../value-objects/NodeConfig.vo';

/**
 * IArchitectureRepository — port (interface) for the architecture state.
 *
 * The domain and application layers depend on this abstraction.
 * The infrastructure layer (Zustand store) provides the concrete implementation.
 * This inversion of dependency is the D in SOLID.
 */
export interface IArchitectureRepository {
  // ── Node reads ──────────────────────────────────────────────────────────────
  getAllNodes(): NodeEntity[];
  getNodeById(id: string): NodeEntity | undefined;

  // ── Node writes ─────────────────────────────────────────────────────────────
  addNode(type: NodeType, label: string, position: Position): void;
  updateNode(id: string, partial: Partial<Omit<NodeEntity, 'id' | 'type'>>): void;
  updateNodeConfig(id: string, partial: Partial<NodeConfig>): void;
  removeNode(id: string): void;
  replaceAllNodes(nodes: NodeEntity[]): void;

  // ── Edge reads ──────────────────────────────────────────────────────────────
  getAllEdges(): EdgeEntity[];

  // ── Edge writes ─────────────────────────────────────────────────────────────
  addEdge(params: CreateEdgeParams): void;
  updateEdge(id: string, partial: Partial<Omit<EdgeEntity, 'id' | 'sourceId' | 'targetId'>>): void;
  removeEdge(id: string): void;
  replaceAllEdges(edges: EdgeEntity[]): void;

  // ── Selection ───────────────────────────────────────────────────────────────
  getSelectedNodeId(): string | null;
  getSelectedEdgeId(): string | null;
  setSelectedNodeId(id: string | null): void;
  setSelectedEdgeId(id: string | null): void;
}
