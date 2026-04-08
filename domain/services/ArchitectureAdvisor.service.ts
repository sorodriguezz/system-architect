/**
 * ArchitectureAdvisor — pure domain service.
 * Analyses the current architecture graph and emits actionable insights
 * for architects. Zero side effects; returns an array of AdvisorAlert objects.
 *
 * Each rule is isolated and documented.  Add new rules by appending to RULES.
 */

import { NodeEntity } from '@/domain/entities/Node.entity';
import { EdgeEntity  } from '@/domain/entities/Edge.entity';
import { NodeType    } from '@/domain/constants/NodeTypes.constant';

// ─────────────────────────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface AdvisorAlert {
  id:           string;        // unique rule identifier
  severity:     AlertSeverity;
  category:     AlertCategory;
  title:        string;
  description:  string;
  affectedIds:  string[];      // nodeIds involved
  fix:          string[];      // actionable steps
}

export type AlertCategory =
  | 'reliability'
  | 'security'
  | 'performance'
  | 'cost'
  | 'scalability'
  | 'observability'
  | 'data'
  | 'network';

// ─────────────────────────────────────────────────────────────────────────────

type Rule = (nodes: NodeEntity[], edges: EdgeEntity[]) => AdvisorAlert | null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function nodesOfType(nodes: NodeEntity[], ...types: string[]): NodeEntity[] {
  return nodes.filter(n => types.includes(n.type));
}

function edgesFrom(edges: EdgeEntity[], nodeId: string): EdgeEntity[] {
  return edges.filter(e => e.sourceId === nodeId);
}

function edgesTo(edges: EdgeEntity[], nodeId: string): EdgeEntity[] {
  return edges.filter(e => e.targetId === nodeId);
}

function isConnected(edges: EdgeEntity[], fromId: string, toId: string): boolean {
  return edges.some(e => e.sourceId === fromId && e.targetId === toId);
}

function incomingNeighbours(edges: EdgeEntity[], nodeId: string): string[] {
  return edges.filter(e => e.targetId === nodeId).map(e => e.sourceId);
}

function outgoingNeighbours(edges: EdgeEntity[], nodeId: string): string[] {
  return edges.filter(e => e.sourceId === nodeId).map(e => e.targetId);
}

function syncChainDepth(
  edges: EdgeEntity[],
  startId: string,
  visited = new Set<string>(),
): number {
  if (visited.has(startId)) return 0;
  visited.add(startId);
  const nexts = outgoingNeighbours(edges, startId);
  if (nexts.length === 0) return 0;
  return 1 + Math.max(...nexts.map(id => syncChainDepth(edges, id, visited)));
}

// ── Rules ─────────────────────────────────────────────────────────────────────

const RULES: Rule[] = [

  // ── R01 — No monitoring ─────────────────────────────────────────────────────
  (nodes) => {
    const monitors = nodesOfType(nodes, NodeType.MONITOR);
    if (monitors.length > 0) return null;
    return {
      id: 'R01_NO_MONITOR',
      severity: 'critical',
      category: 'observability',
      title: 'No monitoring configured',
      description:
        'There is no Monitoring node in the architecture. Without observability you cannot detect failures, measure SLOs, or diagnose incidents.',
      affectedIds: [],
      fix: [
        'Add a Monitor node (Datadog, Grafana+Prometheus, etc.)',
        'Connect it to all critical services',
        'Define alert rules: error rate > 1%, P99 latency > 500ms',
        'Set up an on-call rotation with PagerDuty / OpsGenie',
      ],
    };
  },

  // ── R02 — DB reachable without cache ────────────────────────────────────────
  (nodes, edges) => {
    const dbs     = nodesOfType(nodes, NodeType.DATABASE);
    const caches  = nodesOfType(nodes, NodeType.CACHE);
    const servers = nodesOfType(nodes, NodeType.APP_SERVER, NodeType.MICROSERVICE, NodeType.API_GATEWAY);

    if (dbs.length === 0 || servers.length === 0) return null;

    // For each server→DB edge, check if there's also a server→Cache edge
    const uncachedServers = servers.filter(srv => {
      const targetsDb    = dbs.some(db   => isConnected(edges, srv.id, db.id));
      const targetsCache = caches.some(c  => isConnected(edges, srv.id, c.id));
      return targetsDb && !targetsCache;
    });

    if (uncachedServers.length === 0) return null;
    return {
      id: 'R02_MISSING_CACHE',
      severity: 'warning',
      category: 'performance',
      title: 'Services hitting DB without a Cache layer',
      description:
        `${uncachedServers.length} service(s) query the database directly without a caching layer. Under load this saturates DB connections and causes latency spikes.`,
      affectedIds: uncachedServers.map(n => n.id),
      fix: [
        'Add a Cache (Redis/Elasticache) node',
        'Connect each service to the cache before the database',
        'Target ≥85% cache hit rate for read-heavy workloads',
        'Use write-through or cache-aside patterns',
      ],
    };
  },

  // ── R03 — External traffic without WAF ──────────────────────────────────────
  (nodes, edges) => {
    const clients    = nodesOfType(nodes, NodeType.CLIENT);
    const wafs       = nodesOfType(nodes, NodeType.WAF);
    const gateways   = nodesOfType(nodes, NodeType.API_GATEWAY, NodeType.LOAD_BALANCER, NodeType.APP_SERVER);

    if (clients.length === 0) return null;

    // Client-reachable entry points
    const entryPoints = gateways.filter(gw =>
      clients.some(c => isConnected(edges, c.id, gw.id))
    );

    if (entryPoints.length === 0) return null;

    // Any WAF in front of any entry point?
    const hasWaf = entryPoints.some(ep =>
      wafs.some(w => isConnected(edges, w.id, ep.id) || isConnected(edges, w.id, ep.id))
    );

    // Also check if clients connect through WAF first
    const clientThroughWaf = clients.some(c => wafs.some(w => isConnected(edges, c.id, w.id)));

    if (hasWaf || clientThroughWaf || wafs.length > 0) return null;
    return {
      id: 'R03_NO_WAF',
      severity: 'critical',
      category: 'security',
      title: 'No WAF protecting public endpoints',
      description:
        'Your architecture has public-facing entry points with no Web Application Firewall. Exposed APIs are vulnerable to SQLi, XSS, DDoS L7 and credential-stuffing attacks.',
      affectedIds: entryPoints.map(n => n.id),
      fix: [
        'Add a WAF node (AWS WAF, Cloudflare) in front of API Gateway / Load Balancer',
        'Enable OWASP Core Rule Set',
        'Configure rate limiting per IP (e.g. 100 req/min)',
        'Enable bot score filtering for login/payment endpoints',
      ],
    };
  },

  // ── R04 — Payment without WAF upstream ─────────────────────────────────────
  (nodes, edges) => {
    const payments = nodesOfType(nodes, NodeType.PAYMENT);
    const wafs     = nodesOfType(nodes, NodeType.WAF);
    if (payments.length === 0) return null;
    const unprotected = payments.filter(p =>
      !incomingNeighbours(edges, p.id).some(srcId =>
        wafs.some(w => w.id === srcId)
      )
    );
    if (unprotected.length === 0) return null;
    return {
      id: 'R04_PAYMENT_NO_WAF',
      severity: 'critical',
      category: 'security',
      title: 'Payment gateway has no WAF upstream',
      description:
        'Payment nodes require a WAF in the path to block card-testing attacks and comply with PCI DSS requirement 6.4 (web-facing app protection).',
      affectedIds: unprotected.map(p => p.id),
      fix: [
        'Add a WAF node directly upstream of the Payment gateway',
        'Enable Stripe Radar or equivalent fraud scoring',
        'Rate-limit payment endpoints to ≤10 req/min per IP',
        'Never store raw card data — use tokenization only',
      ],
    };
  },

  // ── R05 — Single replica = SPOF ─────────────────────────────────────────────
  (nodes) => {
    const spofs = nodes.filter(n =>
      n.config.replicas <= 1 &&
      !n.config.autoscaling &&
      n.type !== NodeType.CLIENT &&
      n.type !== NodeType.CIRCUIT_BREAKER
    );
    if (spofs.length === 0) return null;
    return {
      id: 'R05_SINGLE_REPLICA',
      severity: 'warning',
      category: 'reliability',
      title: `${spofs.length} node(s) running a single replica`,
      description:
        'Single-replica services have no redundancy. One crash or deploy takes the service down (MTTR = time to restart ≈ 30–120s).',
      affectedIds: spofs.map(n => n.id),
      fix: [
        'Set replicas ≥ 2 on all stateless services',
        'Enable Auto-Scaling with a min of 2',
        'Spread replicas across multiple Availability Zones',
        'Use a Load Balancer with health checks to skip unhealthy instances',
      ],
    };
  },

  // ── R06 — Deep synchronous call chain ──────────────────────────────────────
  (nodes, edges) => {
    const appNodes = nodesOfType(nodes, NodeType.APP_SERVER, NodeType.MICROSERVICE, NodeType.API_GATEWAY);
    let maxDepth = 0;
    let deepestStart = '';
    for (const n of appNodes) {
      const d = syncChainDepth(edges, n.id);
      if (d > maxDepth) { maxDepth = d; deepestStart = n.id; }
    }
    if (maxDepth < 4) return null;
    return {
      id: 'R06_DEEP_SYNC_CHAIN',
      severity: 'warning',
      category: 'performance',
      title: `Synchronous call chain depth: ${maxDepth} hops`,
      description:
        `A chain of ${maxDepth} synchronous hops means end-to-end latency ≥ ${maxDepth * 20}ms minimum, and a single slow service degrades the entire chain (tail latency amplification).`,
      affectedIds: [deepestStart].filter(Boolean),
      fix: [
        'Break chains >3 hops with an async Queue (Kafka/SQS)',
        'Return immediately and process downstream work asynchronously',
        'Use the Saga pattern for distributed transactions instead of blocking chains',
        'Add Circuit Breakers to prevent a slow downstream from blocking upstream callers',
      ],
    };
  },

  // ── R07 — Database fan-in (multiple services, one DB) ──────────────────────
  (nodes, edges) => {
    const dbs = nodesOfType(nodes, NodeType.DATABASE);
    const fanned = dbs.filter(db => {
      const callers = incomingNeighbours(edges, db.id);
      const directAppCallers = callers.filter(id => {
        const n = nodes.find(x => x.id === id);
        return n && [NodeType.APP_SERVER, NodeType.MICROSERVICE].includes(n.type as any);
      });
      return directAppCallers.length > 2;
    });
    if (fanned.length === 0) return null;
    return {
      id: 'R07_DB_FAN_IN',
      severity: 'warning',
      category: 'data',
      title: 'Multiple services sharing a single database',
      description:
        'More than 2 services directly access the same database. This creates tight coupling, schema migration risk, and makes it impossible to scale services independently.',
      affectedIds: fanned.map(n => n.id),
      fix: [
        'Each microservice should own its own database (Database-per-Service pattern)',
        'Use events (Kafka, SNS) to sync data between service databases',
        'Introduce an API or BFF layer to abstract shared data access',
        'If full separation is not feasible, use separate schemas per service at minimum',
      ],
    };
  },

  // ── R08 — No Auth on API Gateway ────────────────────────────────────────────
  (nodes) => {
    const gateways = nodesOfType(nodes, NodeType.API_GATEWAY);
    const auths    = nodesOfType(nodes, NodeType.AUTH);
    if (gateways.length === 0 || auths.length > 0) return null;
    return {
      id: 'R08_NO_AUTH',
      severity: 'critical',
      category: 'security',
      title: 'No Auth service in the architecture',
      description:
        'There is an API Gateway but no authentication service. All endpoints are effectively public — any actor can call any route.',
      affectedIds: gateways.map(n => n.id),
      fix: [
        'Add an Auth node (Auth0, Cognito, Keycloak)',
        'Connect it to the API Gateway for JWT validation',
        'Define scopes/roles per route (read:orders, write:payments, etc.)',
        'Use OAuth 2.0 + PKCE for SPA/mobile clients',
      ],
    };
  },

  // ── R09 — No CDN for client-facing traffic ──────────────────────────────────
  (nodes, edges) => {
    const clients = nodesOfType(nodes, NodeType.CLIENT);
    const cdns    = nodesOfType(nodes, NodeType.CDN);
    if (clients.length === 0 || cdns.length > 0) return null;
    // Only flag if clients connect directly to app servers
    const appServers = nodesOfType(nodes, NodeType.APP_SERVER, NodeType.API_GATEWAY);
    const directHit  = appServers.some(srv =>
      clients.some(c => isConnected(edges, c.id, srv.id))
    );
    if (!directHit) return null;
    return {
      id: 'R09_NO_CDN',
      severity: 'info',
      category: 'performance',
      title: 'No CDN — users hit origin servers directly',
      description:
        'Client traffic reaches your app server without a CDN. Static assets (JS, CSS, images) are served at origin latency and origin egress cost instead of from an edge node near the user.',
      affectedIds: clients.map(n => n.id),
      fix: [
        'Add a CDN node (Cloudflare, CloudFront) in front of your entry point',
        'Cache static assets with long TTLs (Cache-Control: max-age=31536000)',
        'Use CDN for API response caching where applicable (GET endpoints)',
        'Geo-route users to the nearest CDN PoP',
      ],
    };
  },

  // ── R10 — Overprovisioned nodes (replicas > 8 with low CPU) ─────────────────
  (nodes) => {
    const over = nodes.filter(n =>
      n.config.replicas > 8 &&
      n.metrics.cpuLoad < 20 &&
      n.metrics.rps > 0
    );
    if (over.length === 0) return null;
    return {
      id: 'R10_OVERPROVISIONED',
      severity: 'info',
      category: 'cost',
      title: `${over.length} node(s) overprovisioned (high replicas, low CPU)`,
      description:
        'Some nodes have >8 replicas but CPU usage is under 20%. You are paying for idle compute. At cloud pricing, 4 extra idle t3.mediums cost ~$120/month unnecessarily.',
      affectedIds: over.map(n => n.id),
      fix: [
        'Reduce manual replica count to match actual load',
        'Enable Auto-Scaling instead of static over-provisioning',
        'Set scale-in cooldown to prevent thrashing during traffic spikes',
        'Use Compute Savings Plans or Reserved Instances to cut baseline cost 30–40%',
      ],
    };
  },

  // ── R11 — Queue without a Worker ─────────────────────────────────────────────
  (nodes, edges) => {
    const queues  = nodesOfType(nodes, NodeType.QUEUE);
    const workers = nodesOfType(nodes, NodeType.WORKER);
    if (queues.length === 0) return null;
    const orphaned = queues.filter(q =>
      !workers.some(w => isConnected(edges, q.id, w.id) || isConnected(edges, w.id, q.id))
    );
    if (orphaned.length === 0) return null;
    return {
      id: 'R11_QUEUE_NO_WORKER',
      severity: 'warning',
      category: 'reliability',
      title: `${orphaned.length} queue(s) with no connected Worker`,
      description:
        'A Queue without a Worker means messages accumulate indefinitely. The queue will fill up and producers will start failing with backpressure errors.',
      affectedIds: orphaned.map(n => n.id),
      fix: [
        'Add a Worker node and connect it to the Queue',
        'Size workers based on queue depth, not CPU — 1 worker per N expected messages/sec',
        'Add a Dead Letter Queue (DLQ) to capture failed messages',
        'Set a message visibility timeout longer than max processing time',
      ],
    };
  },

  // ── R12 — Unencrypted edges on external-facing paths ────────────────────────
  (nodes, edges) => {
    const clients       = nodesOfType(nodes, NodeType.CLIENT);
    const clientIds     = new Set(clients.map(c => c.id));
    const unencrypted   = edges.filter(e =>
      !e.isEncrypted && clientIds.has(e.sourceId)
    );
    if (unencrypted.length === 0) return null;
    return {
      id: 'R12_UNENCRYPTED_EDGE',
      severity: 'critical',
      category: 'security',
      title: 'Unencrypted connections from client to backend',
      description:
        'One or more edges from user clients are not encrypted. HTTP without TLS exposes session tokens, credentials and user data to MITM attacks. PCI DSS and GDPR both require encryption in transit.',
      affectedIds: unencrypted.map(e => e.id),
      fix: [
        'Enable TLS on all client-to-service edges (toggle "Encrypted" on the edge)',
        'Redirect HTTP → HTTPS at the CDN / Load Balancer level',
        'Use HSTS headers to prevent downgrade attacks',
        'Enforce TLS 1.2 minimum; prefer TLS 1.3',
      ],
    };
  },

  // ── R13 — High CPU (>80%) on active nodes ───────────────────────────────────
  (nodes) => {
    const hot = nodes.filter(n =>
      n.metrics.cpuLoad > 80 &&
      n.status !== 'down' &&
      n.metrics.rps > 0
    );
    if (hot.length === 0) return null;
    return {
      id: 'R13_HIGH_CPU',
      severity: 'warning',
      category: 'scalability',
      title: `${hot.length} node(s) running at >80% CPU`,
      description:
        'CPU above 80% is the inflection point where latency grows non-linearly (exponential degradation). At 90%+ requests start queuing and error rates climb.',
      affectedIds: hot.map(n => n.id),
      fix: [
        'Increase replicas on the affected nodes',
        'Enable Auto-Scaling with a target CPU of 60–70%',
        'Profile the hottest endpoint — 80% of CPU often comes from 20% of code paths',
        'Check for missing caching or N+1 query patterns upstream',
      ],
    };
  },

  // ── R14 — No Circuit Breaker for DB/Search/Payment ──────────────────────────
  (nodes, edges) => {
    const criticals = nodesOfType(nodes, NodeType.DATABASE, NodeType.SEARCH, NodeType.PAYMENT);
    const cbs       = nodesOfType(nodes, NodeType.CIRCUIT_BREAKER);
    if (criticals.length === 0 || cbs.length > 0) return null;
    return {
      id: 'R14_NO_CIRCUIT_BREAKER',
      severity: 'info',
      category: 'reliability',
      title: 'No Circuit Breaker protecting critical dependencies',
      description:
        'Without circuit breakers, a slow database or payment gateway will hold threads open until they time out, eventually exhausting your thread pool and bringing down the calling service.',
      affectedIds: criticals.map(n => n.id),
      fix: [
        'Add a Circuit Breaker node between App Servers and critical dependencies',
        'Set error threshold: open circuit at 50% errors over 10s',
        'Define fallback responses (cached result, degraded mode, user-facing error)',
        'Use half-open state to test recovery before fully closing the circuit',
      ],
    };
  },

  // ── R15 — No Queue buffering traffic to DB/Worker ────────────────────────────
  (nodes, edges) => {
    const appNodes = nodesOfType(nodes, NodeType.APP_SERVER, NodeType.MICROSERVICE);
    const dbs      = nodesOfType(nodes, NodeType.DATABASE);
    const queues   = nodesOfType(nodes, NodeType.QUEUE);
    if (queues.length > 0 || dbs.length === 0 || appNodes.length === 0) return null;
    const directToDB = appNodes.filter(a => dbs.some(db => isConnected(edges, a.id, db.id)));
    if (directToDB.length === 0) return null;
    return {
      id: 'R15_NO_QUEUE_BUFFER',
      severity: 'info',
      category: 'scalability',
      title: 'No async queue — all writes go directly to the database',
      description:
        'Under traffic spikes, synchronous writes overwhelm the database. A message queue absorbs burst traffic and provides back-pressure, preventing write storms.',
      affectedIds: directToDB.map(n => n.id),
      fix: [
        'Add a Queue (SQS/Kafka) for non-critical write operations (notifications, logs, analytics)',
        'Keep synchronous writes only for operations that need immediate consistency',
        'Use the CQRS pattern: write commands go to queue, reads go to cache/DB',
        'Workers consume the queue at a sustainable rate, protecting the database',
      ],
    };
  },

  // ── R16 — No CDN for Storage egress ─────────────────────────────────────────
  (nodes, edges) => {
    const storages = nodesOfType(nodes, NodeType.STORAGE);
    const cdns     = nodesOfType(nodes, NodeType.CDN);
    if (storages.length === 0 || cdns.length > 0) return null;
    const directClients = storages.filter(s => {
      const incoming = incomingNeighbours(edges, s.id);
      return incoming.some(id => {
        const n = nodes.find(x => x.id === id);
        return n?.type === NodeType.APP_SERVER || n?.type === NodeType.MICROSERVICE;
      });
    });
    if (directClients.length === 0) return null;
    return {
      id: 'R16_STORAGE_NO_CDN',
      severity: 'info',
      category: 'cost',
      title: 'S3/Storage served directly without CDN',
      description:
        'Serving files directly from S3 costs $0.09/GB egress vs $0.008/GB through CloudFront. For 1TB/month that is $90 vs $8. A CDN also reduces latency from 100–200ms to 5–30ms.',
      affectedIds: storages.map(n => n.id),
      fix: [
        'Add a CDN node in front of your Storage node',
        'Configure S3 bucket as CloudFront origin with OAC (Origin Access Control)',
        'Set Cache-Control headers: max-age=86400 for user content, max-age=31536000 for assets',
        'Block direct public S3 access — require all requests through CDN',
      ],
    };
  },

  // ── R17 — All-green during simulation (positive feedback) ────────────────────
  (nodes) => {
    const active = nodes.filter(n => n.metrics.rps > 0);
    if (active.length < 3) return null;
    const allHealthy = active.every(n => n.status === 'healthy' && n.metrics.errorRate < 0.5);
    if (!allHealthy) return null;
    return {
      id: 'R17_ALL_HEALTHY',
      severity: 'success',
      category: 'reliability',
      title: 'Architecture is healthy under current load',
      description:
        `All ${active.length} active nodes are healthy with error rates below 0.5%. Your architecture is handling current traffic well.`,
      affectedIds: [],
      fix: [
        'Try increasing traffic (slider) to find your breaking point',
        'Run Chaos Engineering on individual nodes to test resilience',
        'Simulate a database failure — does your system degrade gracefully or crash?',
        'Check if latency stays under your SLO (P99 < 500ms) under 2× load',
      ],
    };
  },
];

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run all advisor rules and return alerts sorted by severity.
 * Pure function — no side effects.
 */
export function runAdvisor(
  nodes: NodeEntity[],
  edges: EdgeEntity[],
): AdvisorAlert[] {
  const SEVERITY_ORDER: Record<AlertSeverity, number> = {
    critical: 0,
    warning:  1,
    info:     2,
    success:  3,
  };

  return RULES
    .map(rule => rule(nodes, edges))
    .filter((a): a is AdvisorAlert => a !== null)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
