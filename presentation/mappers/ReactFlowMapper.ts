import { Node, Edge, MarkerType } from '@xyflow/react';
import { NodeEntity } from '@/domain/entities/Node.entity';
import { EdgeEntity } from '@/domain/entities/Edge.entity';
import { SimulationConstants } from '@/domain/constants/SimulationConstants.constant';

/**
 * ReactFlowMapper — translates domain entities into ReactFlow data structures.
 *
 * The domain layer must never import from @xyflow/react.
 * This mapper is the anti-corruption layer between them.
 */

export function nodeEntityToRFNode(entity: NodeEntity): Node {
  return {
    id:       entity.id,
    type:     entity.type,
    position: entity.position,
    data:     entity as unknown as Record<string, unknown>,
    selected: entity.isSpof ? false : undefined,
    draggable:true,
  };
}

export function edgeEntityToRFEdge(entity: EdgeEntity): Edge {
  const sourceColor = '#6366f1'; // Default; real color comes from AnimatedEdge component

  return {
    id:     entity.id,
    source: entity.sourceId,
    target: entity.targetId,
    type:   'animated',
    data:   entity as unknown as Record<string, unknown>,
    markerEnd: {
      type:   MarkerType.ArrowClosed,
      color:  sourceColor,
      width:  12,
      height: 12,
    },
    style: { stroke: 'transparent' },
  };
}

export function nodesToRFNodes(entities: NodeEntity[]): Node[] {
  return entities.map(nodeEntityToRFNode);
}

export function edgesToRFEdges(entities: EdgeEntity[]): Edge[] {
  return entities.map(edgeEntityToRFEdge);
}
