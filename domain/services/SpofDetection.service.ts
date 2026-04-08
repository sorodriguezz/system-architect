import { NodeEntity } from '../entities/Node.entity';
import { EdgeEntity } from '../entities/Edge.entity';
import { NodeType } from '../constants/NodeTypes.constant';

/**
 * SpofDetectionService — pure domain service.
 *
 * A Single Point of Failure is any node whose removal would partition
 * the critical path and whose replica count == 1.
 *
 * This is intentionally a pure function with no framework imports —
 * it can be unit-tested in complete isolation.
 */

const CRITICAL_NODE_TYPES = new Set<NodeType>([
  NodeType.LOAD_BALANCER,
  NodeType.API_GATEWAY,
  NodeType.DATABASE,
  NodeType.AUTH,
]);

interface DegreeMap {
  in:  Map<string, number>;
  out: Map<string, number>;
}

function buildDegreeMap(nodes: NodeEntity[], edges: EdgeEntity[]): DegreeMap {
  const inDegree  = new Map<string, number>(nodes.map(n => [n.id, 0]));
  const outDegree = new Map<string, number>(nodes.map(n => [n.id, 0]));

  for (const edge of edges) {
    inDegree.set(edge.targetId, (inDegree.get(edge.targetId) ?? 0) + 1);
    outDegree.set(edge.sourceId, (outDegree.get(edge.sourceId) ?? 0) + 1);
  }

  return { in: inDegree, out: outDegree };
}

function isSingleReplicaCriticalNode(node: NodeEntity): boolean {
  return (
    node.config.replicas === 1 &&
    CRITICAL_NODE_TYPES.has(node.type) &&
    node.metrics.rps > 0
  );
}

function isSingleConnectionBottleneck(
  node: NodeEntity,
  degreeMap: DegreeMap
): boolean {
  const inDeg  = degreeMap.in.get(node.id)  ?? 0;
  const outDeg = degreeMap.out.get(node.id) ?? 0;
  return (
    inDeg === 1 &&
    outDeg === 1 &&
    CRITICAL_NODE_TYPES.has(node.type)
  );
}

/**
 * Returns the set of node IDs that are identified as SPOFs.
 */
export function detectSpofIds(
  nodes: NodeEntity[],
  edges: EdgeEntity[]
): ReadonlySet<string> {
  const degreeMap = buildDegreeMap(nodes, edges);
  const spofIds   = new Set<string>();

  for (const node of nodes) {
    if (node.type === NodeType.CLIENT) continue;

    if (
      isSingleReplicaCriticalNode(node) ||
      isSingleConnectionBottleneck(node, degreeMap)
    ) {
      spofIds.add(node.id);
    }
  }

  return spofIds;
}
