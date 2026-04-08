import { IArchitectureRepository } from '@/domain/repositories/IArchitectureRepository';
import { NodeEntity } from '@/domain/entities/Node.entity';
import { SimulationConstants } from '@/domain/constants/SimulationConstants.constant';

/**
 * AutoLayoutUseCase — computes a deterministic layered layout.
 *
 * Algorithm: nodes are grouped into horizontal layers based on their
 * type's position in the data-flow hierarchy, then distributed
 * vertically within each layer to minimize overlap.
 */

const { LAYER_GAP_X, NODE_GAP_Y, START_X, START_Y, CENTER_HEIGHT } =
  SimulationConstants.LAYOUT;

type LayerMap = Map<number, NodeEntity[]>;

function groupNodesByLayer(nodes: NodeEntity[]): LayerMap {
  const layers: LayerMap = new Map();

  for (const node of nodes) {
    const layer = SimulationConstants.LAYOUT_LAYER_BY_TYPE[node.type] ?? 5;
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(node);
  }

  return layers;
}

function computeLayerPositions(
  layers: LayerMap
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  const sortedLayerIndexes = Array.from(layers.keys()).sort((a, b) => a - b);

  sortedLayerIndexes.forEach((layerIndex, columnIndex) => {
    const layerNodes  = layers.get(layerIndex)!;
    const totalHeight = (layerNodes.length - 1) * NODE_GAP_Y;
    const startY      = START_Y + (CENTER_HEIGHT - totalHeight) / 2;

    layerNodes.forEach((node, rowIndex) => {
      positions.set(node.id, {
        x: START_X + columnIndex * LAYER_GAP_X,
        y: startY + rowIndex * NODE_GAP_Y,
      });
    });
  });

  return positions;
}

export function autoLayout(repository: IArchitectureRepository): void {
  const nodes = repository.getAllNodes();
  if (nodes.length === 0) return;

  const layers    = groupNodesByLayer(nodes);
  const positions = computeLayerPositions(layers);

  const repositioned = nodes.map(node => {
    const pos = positions.get(node.id);
    return pos ? NodeEntity.update(node, { position: pos }) : node;
  });

  repository.replaceAllNodes(repositioned);
}
