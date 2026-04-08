'use client';
import { ReactFlowProvider } from '@xyflow/react';
import { ArchitectureCanvas } from '@/presentation/components/organisms/ArchitectureCanvas.organism';

/**
 * Root page — thin entry point.
 * All composition lives in ArchitectureCanvas.
 * ReactFlowProvider must wrap the canvas to provide the RF context.
 */
export default function Page() {
  return (
    <ReactFlowProvider>
      <ArchitectureCanvas />
    </ReactFlowProvider>
  );
}
