import { NodeType, ComponentCategory } from './NodeTypes.constant';
import { SimulationConstants } from './SimulationConstants.constant';

/**
 * ComponentDescriptor — read-only metadata for each draggable component type.
 * This is pure data — no business logic, no framework imports.
 */
export interface ComponentDescriptor {
  readonly type: NodeType;
  readonly label: string;
  readonly category: ComponentCategory;
  readonly description: string;
  readonly color: string;
  readonly icon: string;
  readonly baseCostPerHour: number;
  readonly defaultMaxRps: number;
  readonly defaultReplicas: number;
}

export const COMPONENT_REGISTRY: ReadonlyArray<ComponentDescriptor> = [
  {
    type: NodeType.CLIENT,
    label: 'Users',
    category: ComponentCategory.TRAFFIC_EDGE,
    description: 'End-user clients — browsers and mobile apps',
    color: SimulationConstants.COLOR_BY_TYPE.client,
    icon: SimulationConstants.ICON_BY_TYPE.client,
    baseCostPerHour: 0,
    defaultMaxRps: 5000,
    defaultReplicas: 1,
  },
  {
    type: NodeType.DNS,
    label: 'DNS',
    category: ComponentCategory.TRAFFIC_EDGE,
    description: 'Domain Name System resolver',
    color: SimulationConstants.COLOR_BY_TYPE.dns,
    icon: SimulationConstants.ICON_BY_TYPE.dns,
    baseCostPerHour: 0.01,
    defaultMaxRps: 100000,
    defaultReplicas: 1,
  },
  {
    type: NodeType.CDN,
    label: 'CDN',
    category: ComponentCategory.TRAFFIC_EDGE,
    description: 'Content Delivery Network (Cloudflare, CloudFront)',
    color: SimulationConstants.COLOR_BY_TYPE.cdn,
    icon: SimulationConstants.ICON_BY_TYPE.cdn,
    baseCostPerHour: 0.08,
    defaultMaxRps: 50000,
    defaultReplicas: 1,
  },
  {
    type: NodeType.WAF,
    label: 'WAF',
    category: ComponentCategory.SECURITY,
    description: 'Web Application Firewall — blocks malicious traffic',
    color: SimulationConstants.COLOR_BY_TYPE.waf,
    icon: SimulationConstants.ICON_BY_TYPE.waf,
    baseCostPerHour: 0.05,
    defaultMaxRps: 30000,
    defaultReplicas: 1,
  },
  {
    type: NodeType.LOAD_BALANCER,
    label: 'Load Balancer',
    category: ComponentCategory.TRAFFIC_EDGE,
    description: 'Distributes traffic across multiple upstream servers',
    color: SimulationConstants.COLOR_BY_TYPE.loadbalancer,
    icon: SimulationConstants.ICON_BY_TYPE.loadbalancer,
    baseCostPerHour: 0.02,
    defaultMaxRps: 10000,
    defaultReplicas: 2,
  },
  {
    type: NodeType.API_GATEWAY,
    label: 'API Gateway',
    category: ComponentCategory.COMPUTE,
    description: 'Routing, auth, rate limiting, and protocol translation',
    color: SimulationConstants.COLOR_BY_TYPE.apigateway,
    icon: SimulationConstants.ICON_BY_TYPE.apigateway,
    baseCostPerHour: 0.04,
    defaultMaxRps: 5000,
    defaultReplicas: 2,
  },
  {
    type: NodeType.APP_SERVER,
    label: 'App Server',
    category: ComponentCategory.COMPUTE,
    description: 'Application server (Node.js, Python, Java, Go)',
    color: SimulationConstants.COLOR_BY_TYPE.appserver,
    icon: SimulationConstants.ICON_BY_TYPE.appserver,
    baseCostPerHour: 0.10,
    defaultMaxRps: 500,
    defaultReplicas: 3,
  },
  {
    type: NodeType.MICROSERVICE,
    label: 'Microservice',
    category: ComponentCategory.COMPUTE,
    description: 'Independently deployable container service',
    color: SimulationConstants.COLOR_BY_TYPE.microservice,
    icon: SimulationConstants.ICON_BY_TYPE.microservice,
    baseCostPerHour: 0.08,
    defaultMaxRps: 1000,
    defaultReplicas: 2,
  },
  {
    type: NodeType.WORKER,
    label: 'Worker',
    category: ComponentCategory.COMPUTE,
    description: 'Background job processor / async consumer',
    color: SimulationConstants.COLOR_BY_TYPE.worker,
    icon: SimulationConstants.ICON_BY_TYPE.worker,
    baseCostPerHour: 0.07,
    defaultMaxRps: 200,
    defaultReplicas: 2,
  },
  {
    type: NodeType.AUTH,
    label: 'Auth Service',
    category: ComponentCategory.SECURITY,
    description: 'Authentication and Authorization (OAuth2 / JWT)',
    color: SimulationConstants.COLOR_BY_TYPE.auth,
    icon: SimulationConstants.ICON_BY_TYPE.auth,
    baseCostPerHour: 0.03,
    defaultMaxRps: 2000,
    defaultReplicas: 2,
  },
  {
    type: NodeType.DATABASE,
    label: 'Database',
    category: ComponentCategory.STORAGE,
    description: 'Relational / NoSQL database (PostgreSQL, MongoDB)',
    color: SimulationConstants.COLOR_BY_TYPE.database,
    icon: SimulationConstants.ICON_BY_TYPE.database,
    baseCostPerHour: 0.15,
    defaultMaxRps: 3000,
    defaultReplicas: 1,
  },
  {
    type: NodeType.CACHE,
    label: 'Cache',
    category: ComponentCategory.STORAGE,
    description: 'In-memory cache (Redis, Memcached)',
    color: SimulationConstants.COLOR_BY_TYPE.cache,
    icon: SimulationConstants.ICON_BY_TYPE.cache,
    baseCostPerHour: 0.06,
    defaultMaxRps: 50000,
    defaultReplicas: 1,
  },
  {
    type: NodeType.STORAGE,
    label: 'Object Storage',
    category: ComponentCategory.STORAGE,
    description: 'Object / blob storage (S3, GCS, Azure Blob)',
    color: SimulationConstants.COLOR_BY_TYPE.storage,
    icon: SimulationConstants.ICON_BY_TYPE.storage,
    baseCostPerHour: 0.02,
    defaultMaxRps: 5000,
    defaultReplicas: 1,
  },
  {
    type: NodeType.SEARCH,
    label: 'Search Engine',
    category: ComponentCategory.STORAGE,
    description: 'Full-text search (Elasticsearch, Algolia, OpenSearch)',
    color: SimulationConstants.COLOR_BY_TYPE.search,
    icon: SimulationConstants.ICON_BY_TYPE.search,
    baseCostPerHour: 0.12,
    defaultMaxRps: 2000,
    defaultReplicas: 3,
  },
  {
    type: NodeType.QUEUE,
    label: 'Message Queue',
    category: ComponentCategory.MESSAGING,
    description: 'Message broker (Kafka, RabbitMQ, SQS)',
    color: SimulationConstants.COLOR_BY_TYPE.queue,
    icon: SimulationConstants.ICON_BY_TYPE.queue,
    baseCostPerHour: 0.04,
    defaultMaxRps: 100000,
    defaultReplicas: 3,
  },
  {
    type: NodeType.MONITOR,
    label: 'Monitoring',
    category: ComponentCategory.OBSERVABILITY,
    description: 'Metrics, tracing and alerts (Prometheus, Grafana, Datadog)',
    color: SimulationConstants.COLOR_BY_TYPE.monitor,
    icon: SimulationConstants.ICON_BY_TYPE.monitor,
    baseCostPerHour: 0.05,
    defaultMaxRps: 10000,
    defaultReplicas: 1,
  },
  {
    type: NodeType.SERVICE_MESH,
    label: 'Service Mesh',
    category: ComponentCategory.COMPUTE,
    description: 'Service-to-service communication layer (Istio, Linkerd)',
    color: SimulationConstants.COLOR_BY_TYPE.servicemesh,
    icon: SimulationConstants.ICON_BY_TYPE.servicemesh,
    baseCostPerHour: 0.03,
    defaultMaxRps: 20000,
    defaultReplicas: 3,
  },
  {
    type: NodeType.CIRCUIT_BREAKER,
    label: 'Circuit Breaker',
    category: ComponentCategory.COMPUTE,
    description: 'Fault-tolerance pattern (Hystrix, Resilience4j)',
    color: SimulationConstants.COLOR_BY_TYPE.circuitbreaker,
    icon: SimulationConstants.ICON_BY_TYPE.circuitbreaker,
    baseCostPerHour: 0.01,
    defaultMaxRps: 5000,
    defaultReplicas: 1,
  },
  {
    type: NodeType.EMAIL,
    label: 'Email Service',
    category: ComponentCategory.SERVICES,
    description: 'Transactional email delivery (SendGrid, AWS SES)',
    color: SimulationConstants.COLOR_BY_TYPE.email,
    icon: SimulationConstants.ICON_BY_TYPE.email,
    baseCostPerHour: 0.02,
    defaultMaxRps: 100,
    defaultReplicas: 1,
  },
  {
    type: NodeType.PAYMENT,
    label: 'Payment Gateway',
    category: ComponentCategory.SERVICES,
    description: 'Payment processing (Stripe, PayPal, Adyen)',
    color: SimulationConstants.COLOR_BY_TYPE.payment,
    icon: SimulationConstants.ICON_BY_TYPE.payment,
    baseCostPerHour: 0.05,
    defaultMaxRps: 200,
    defaultReplicas: 2,
  },
] as const;

/** Lookup a descriptor by type — O(1) via a derived Map. */
const _descriptorMap = new Map(
  COMPONENT_REGISTRY.map(d => [d.type, d])
);

export function getComponentDescriptor(type: NodeType): ComponentDescriptor | undefined {
  return _descriptorMap.get(type);
}

export const ALL_CATEGORIES: ReadonlyArray<ComponentCategory> = Array.from(
  new Set(COMPONENT_REGISTRY.map(d => d.category))
) as ComponentCategory[];
