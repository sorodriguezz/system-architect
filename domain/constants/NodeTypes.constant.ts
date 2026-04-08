/**
 * NodeTypes — exhaustive enumeration of all architectural component types.
 * Using a const enum ensures zero runtime cost and prevents magic strings.
 */
export const NodeType = {
  CLIENT:         'client',
  DNS:            'dns',
  CDN:            'cdn',
  WAF:            'waf',
  LOAD_BALANCER:  'loadbalancer',
  API_GATEWAY:    'apigateway',
  APP_SERVER:     'appserver',
  MICROSERVICE:   'microservice',
  CACHE:          'cache',
  DATABASE:       'database',
  QUEUE:          'queue',
  WORKER:         'worker',
  STORAGE:        'storage',
  SERVICE_MESH:   'servicemesh',
  CIRCUIT_BREAKER:'circuitbreaker',
  SEARCH:         'search',
  MONITOR:        'monitor',
  AUTH:           'auth',
  EMAIL:          'email',
  PAYMENT:        'payment',
} as const;

export type NodeType = typeof NodeType[keyof typeof NodeType];

// ─────────────────────────────────────────────────────────────────────────────

export const NodeStatus = {
  HEALTHY:    'healthy',
  DEGRADED:   'degraded',
  OVERLOADED: 'overloaded',
  DOWN:       'down',
  STARTING:   'starting',
} as const;

export type NodeStatus = typeof NodeStatus[keyof typeof NodeStatus];

// ─────────────────────────────────────────────────────────────────────────────

export const EdgeProtocol = {
  HTTP:      'http',
  HTTPS:     'https',
  GRPC:      'grpc',
  TCP:       'tcp',
  WEBSOCKET: 'websocket',
  AMQP:      'amqp',
  REDIS:     'redis',
} as const;

export type EdgeProtocol = typeof EdgeProtocol[keyof typeof EdgeProtocol];

// ─────────────────────────────────────────────────────────────────────────────

export const LbAlgorithm = {
  ROUND_ROBIN:       'round-robin',
  LEAST_CONNECTIONS: 'least-connections',
  IP_HASH:           'ip-hash',
  RANDOM:            'random',
  WEIGHTED:          'weighted',
} as const;

export type LbAlgorithm = typeof LbAlgorithm[keyof typeof LbAlgorithm];

// ─────────────────────────────────────────────────────────────────────────────

export const DatabaseEngine = {
  POSTGRES:  'postgres',
  MYSQL:     'mysql',
  MONGODB:   'mongodb',
  REDIS:     'redis',
  CASSANDRA: 'cassandra',
  DYNAMODB:  'dynamodb',
} as const;

export type DatabaseEngine = typeof DatabaseEngine[keyof typeof DatabaseEngine];

// ─────────────────────────────────────────────────────────────────────────────

export const QueueBroker = {
  KAFKA:     'kafka',
  RABBITMQ:  'rabbitmq',
  SQS:       'sqs',
  PUBSUB:    'pubsub',
  NATS:      'nats',
} as const;

export type QueueBroker = typeof QueueBroker[keyof typeof QueueBroker];

// ─────────────────────────────────────────────────────────────────────────────

export const StorageProvider = {
  S3:         's3',
  GCS:        'gcs',
  AZURE_BLOB: 'azure-blob',
  MINIO:      'minio',
} as const;

export type StorageProvider = typeof StorageProvider[keyof typeof StorageProvider];

// ─────────────────────────────────────────────────────────────────────────────

export const ComponentCategory = {
  TRAFFIC_EDGE:   'Traffic & Edge',
  COMPUTE:        'Compute',
  STORAGE:        'Storage',
  MESSAGING:      'Messaging',
  SECURITY:       'Security',
  OBSERVABILITY:  'Observability',
  SERVICES:       'Services',
} as const;

export type ComponentCategory = typeof ComponentCategory[keyof typeof ComponentCategory];

// ─────────────────────────────────────────────────────────────────────────────

export const CloudRegion = {
  US_EAST_1:       'us-east-1',
  US_WEST_2:       'us-west-2',
  EU_WEST_1:       'eu-west-1',
  AP_SOUTHEAST_1:  'ap-southeast-1',
  AP_NORTHEAST_1:  'ap-northeast-1',
} as const;

export type CloudRegion = typeof CloudRegion[keyof typeof CloudRegion];

// ─────────────────────────────────────────────────────────────────────────────

export const ServiceTier = {
  FREE:       'free',
  STANDARD:   'standard',
  PREMIUM:    'premium',
  ENTERPRISE: 'enterprise',
} as const;

export type ServiceTier = typeof ServiceTier[keyof typeof ServiceTier];
