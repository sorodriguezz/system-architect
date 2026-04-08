import { IArchitectureRepository } from '@/domain/repositories/IArchitectureRepository';
import { NodeType } from '@/domain/constants/NodeTypes.constant';
import { getComponentDescriptor } from '@/domain/constants/ComponentRegistry.constant';
import type { Position } from '@/domain/entities/Node.entity';

/**
 * AddNodeUseCase — orchestrates dropping a new component onto the canvas.
 *
 * The use case:
 * 1. Resolves the default label from the component registry
 * 2. Delegates entity creation to the repository (infrastructure)
 *
 * It does NOT know about React, Zustand, or any UI framework.
 */
export function addNode(
  repository: IArchitectureRepository,
  type: NodeType,
  position: Position,
  labelOverride?: string
): void {
  const descriptor = getComponentDescriptor(type);
  const label = labelOverride ?? descriptor?.label ?? type;
  repository.addNode(type, label, position);
}
