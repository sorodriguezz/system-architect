import { IArchitectureRepository } from '@/domain/repositories/IArchitectureRepository';
import { NodeType, EdgeProtocol } from '@/domain/constants/NodeTypes.constant';

/**
 * LoadDefaultArchitectureUseCase — seeds the canvas with a reference
 * microservices architecture for demonstration purposes.
 *
 * Topology modelled:
 *   Users → DNS / CDN → WAF → LB → API Gateway → App Servers ×2
 *                                              → Auth Service
 *   App Servers → Cache (Redis)
 *   App Servers → PostgreSQL
 *   App Servers → Kafka → Workers → S3
 *   Monitoring observes the API Gateway
 */
export function loadDefaultArchitecture(
  repository: IArchitectureRepository
): void {
  // Clear existing state first
  repository.replaceAllNodes([]);
  repository.replaceAllEdges([]);
  repository.setSelectedNodeId(null);
  repository.setSelectedEdgeId(null);

  // ── Add nodes ────────────────────────────────────────────────────────────────
  repository.addNode(NodeType.CLIENT,       'Users',          { x:   60, y: 280 });
  repository.addNode(NodeType.DNS,          'DNS',            { x:  280, y: 180 });
  repository.addNode(NodeType.CDN,          'CDN',            { x:  280, y: 380 });
  repository.addNode(NodeType.WAF,          'WAF',            { x:  500, y: 180 });
  repository.addNode(NodeType.LOAD_BALANCER,'Load Balancer',  { x:  720, y: 280 });
  repository.addNode(NodeType.API_GATEWAY,  'API Gateway',    { x:  950, y: 280 });
  repository.addNode(NodeType.AUTH,         'Auth Service',   { x:  950, y: 100 });
  repository.addNode(NodeType.APP_SERVER,   'App Server 1',   { x: 1180, y: 180 });
  repository.addNode(NodeType.APP_SERVER,   'App Server 2',   { x: 1180, y: 380 });
  repository.addNode(NodeType.CACHE,        'Redis Cache',    { x: 1420, y: 180 });
  repository.addNode(NodeType.DATABASE,     'PostgreSQL',     { x: 1420, y: 380 });
  repository.addNode(NodeType.QUEUE,        'Kafka',          { x: 1180, y: 560 });
  repository.addNode(NodeType.WORKER,       'Workers',        { x: 1420, y: 560 });
  repository.addNode(NodeType.STORAGE,      'S3 Storage',     { x: 1650, y: 380 });
  repository.addNode(NodeType.MONITOR,      'Monitoring',     { x:  950, y: 460 });

  // Retrieve node IDs by position in creation order
  const nodes = repository.getAllNodes();
  const [
    client, dns, cdn, waf, lb, gw, auth,
    app1, app2, cache, db, queue, worker, storage, monitor,
  ] = nodes;

  if (!client || !gw) return; // Guard: nodes must have been created

  // ── Add edges ────────────────────────────────────────────────────────────────
  const edges: Array<{ sourceId: string; targetId: string; protocol: EdgeProtocol; isEncrypted?: boolean }> = [
    { sourceId: client.id,  targetId: dns.id,    protocol: EdgeProtocol.HTTPS, isEncrypted: true  },
    { sourceId: client.id,  targetId: cdn.id,    protocol: EdgeProtocol.HTTPS, isEncrypted: true  },
    { sourceId: dns.id,     targetId: waf.id,    protocol: EdgeProtocol.HTTPS, isEncrypted: true  },
    { sourceId: cdn.id,     targetId: lb.id,     protocol: EdgeProtocol.HTTPS, isEncrypted: true  },
    { sourceId: waf.id,     targetId: lb.id,     protocol: EdgeProtocol.HTTPS, isEncrypted: true  },
    { sourceId: lb.id,      targetId: gw.id,     protocol: EdgeProtocol.HTTP                      },
    { sourceId: gw.id,      targetId: auth.id,   protocol: EdgeProtocol.GRPC                      },
    { sourceId: gw.id,      targetId: app1.id,   protocol: EdgeProtocol.HTTP                      },
    { sourceId: gw.id,      targetId: app2.id,   protocol: EdgeProtocol.HTTP                      },
    { sourceId: app1.id,    targetId: cache.id,  protocol: EdgeProtocol.REDIS                     },
    { sourceId: app2.id,    targetId: cache.id,  protocol: EdgeProtocol.REDIS                     },
    { sourceId: app1.id,    targetId: db.id,     protocol: EdgeProtocol.TCP                       },
    { sourceId: app2.id,    targetId: db.id,     protocol: EdgeProtocol.TCP                       },
    { sourceId: app1.id,    targetId: queue.id,  protocol: EdgeProtocol.AMQP                      },
    { sourceId: app2.id,    targetId: queue.id,  protocol: EdgeProtocol.AMQP                      },
    { sourceId: queue.id,   targetId: worker.id, protocol: EdgeProtocol.AMQP                      },
    { sourceId: worker.id,  targetId: storage.id,protocol: EdgeProtocol.HTTPS                     },
    { sourceId: monitor.id, targetId: gw.id,     protocol: EdgeProtocol.HTTP                      },
  ];

  for (const edge of edges) {
    repository.addEdge(edge);
  }
}
