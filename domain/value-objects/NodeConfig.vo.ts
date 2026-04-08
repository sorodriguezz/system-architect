import {
  LbAlgorithm,
  DatabaseEngine,
  QueueBroker,
  StorageProvider,
  CloudRegion,
  ServiceTier,
  NodeType,
} from '../constants/NodeTypes.constant';

/**
 * NodeConfig — immutable value object for node configuration.
 * Contains both generic settings and type-specific overrides.
 */
export interface NodeConfig {
  readonly replicas: number;
  readonly maxRps: number;
  readonly timeoutMs: number;
  readonly retries: number;
  readonly autoscaling: boolean;
  readonly minReplicas: number;
  readonly maxReplicas: number;
  readonly sslEnabled: boolean;
  readonly authEnabled: boolean;
  readonly region: CloudRegion;
  readonly tier: ServiceTier;
  // Type-specific (optional)
  readonly lbAlgorithm?: LbAlgorithm;
  readonly cacheHitRate?: number;
  readonly dbEngine?: DatabaseEngine;
  readonly queueBroker?: QueueBroker;
  readonly storageProvider?: StorageProvider;
}

const TYPE_SPECIFIC_DEFAULTS: Partial<Record<NodeType, Partial<NodeConfig>>> = {
  [NodeType.LOAD_BALANCER]:  { lbAlgorithm: LbAlgorithm.ROUND_ROBIN, maxRps: 10000 },
  [NodeType.CACHE]:          { cacheHitRate: 85, maxRps: 50000 },
  [NodeType.DATABASE]:       { dbEngine: DatabaseEngine.POSTGRES, maxRps: 3000 },
  [NodeType.QUEUE]:          { queueBroker: QueueBroker.KAFKA, maxRps: 100000 },
  [NodeType.STORAGE]:        { storageProvider: StorageProvider.S3, maxRps: 5000 },
};

const BASE_DEFAULTS: NodeConfig = {
  replicas:        1,
  maxRps:          1000,
  timeoutMs:       30000,
  retries:         3,
  autoscaling:     false,
  minReplicas:     1,
  maxReplicas:     10,
  sslEnabled:      true,
  authEnabled:     false,
  region:          CloudRegion.US_EAST_1,
  tier:            ServiceTier.STANDARD,
};

export const NodeConfig = {
  /**
   * Creates a fully-initialized NodeConfig for a given node type,
   * merging type-specific defaults on top of base defaults.
   */
  createForType(type: NodeType, maxRps?: number, replicas?: number): NodeConfig {
    const typeSpecific = TYPE_SPECIFIC_DEFAULTS[type] ?? {};
    return {
      ...BASE_DEFAULTS,
      ...(maxRps    !== undefined && { maxRps }),
      ...(replicas  !== undefined && { replicas }),
      ...typeSpecific,
    };
  },

  /**
   * Returns a new config with the given fields overridden.
   * Preserves immutability.
   */
  update(current: NodeConfig, partial: Partial<NodeConfig>): NodeConfig {
    return { ...current, ...partial };
  },
} as const;
