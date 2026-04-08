import { IArchitectureRepository } from '@/domain/repositories/IArchitectureRepository';
import { NodeType, EdgeProtocol } from '@/domain/constants/NodeTypes.constant';

/**
 * LoadDefaultArchitectureUseCase — seeds the canvas with a rich
 * microservices architecture for demonstration purposes.
 *
 * Topology modelled (e-commerce / SaaS reference):
 *
 *   Users → DNS → WAF → Load Balancer → Circuit Breaker → API Gateway
 *         → CDN ↗
 *
 *   API Gateway → Auth Service
 *              → App Server 1 ─────┐
 *              → App Server 2 ─────┤→ Redis Cache
 *                                  ├→ PostgreSQL
 *                                  ├→ Kafka ──→ Workers → S3 Storage
 *                                  │                    → Email Service
 *                                  ├→ Search Engine
 *                                  └→ Payment Service → PostgreSQL
 *
 *   API Gateway → Microservice → PostgreSQL
 *
 *   Monitoring observes API Gateway + App Servers
 */
export function loadDefaultArchitecture(
  repository: IArchitectureRepository
): void {
  repository.replaceAllNodes([]);
  repository.replaceAllEdges([]);
  repository.setSelectedNodeId(null);
  repository.setSelectedEdgeId(null);

  // ── Column positions ─────────────────────────────────────────────────────────
  // C0=60   C1=300  C2=520  C3=740   C4=960   C5=1180  C6=1400  C7=1620  C8=1840

  repository.addNode(NodeType.CLIENT,          'Users',           { x:   60, y: 340 });
  repository.addNode(NodeType.DNS,             'DNS',             { x:  300, y: 200 });
  repository.addNode(NodeType.CDN,             'CDN',             { x:  300, y: 480 });
  repository.addNode(NodeType.WAF,             'WAF',             { x:  520, y: 200 });
  repository.addNode(NodeType.LOAD_BALANCER,   'Load Balancer',   { x:  740, y: 340 });
  repository.addNode(NodeType.CIRCUIT_BREAKER, 'Circuit Breaker', { x:  960, y: 340 });
  repository.addNode(NodeType.API_GATEWAY,     'API Gateway',     { x: 1180, y: 340 });
  repository.addNode(NodeType.AUTH,            'Auth Service',    { x: 1180, y: 120 });
  repository.addNode(NodeType.APP_SERVER,      'App Server 1',    { x: 1400, y: 200 });
  repository.addNode(NodeType.APP_SERVER,      'App Server 2',    { x: 1400, y: 460 });
  repository.addNode(NodeType.MICROSERVICE,    'User Service',    { x: 1400, y: 700 });
  repository.addNode(NodeType.CACHE,           'Redis Cache',     { x: 1620, y: 80  });
  repository.addNode(NodeType.DATABASE,        'PostgreSQL',      { x: 1620, y: 330 });
  repository.addNode(NodeType.SEARCH,          'Search Engine',   { x: 1620, y: 560 });
  repository.addNode(NodeType.QUEUE,           'Kafka',           { x: 1620, y: 780 });
  repository.addNode(NodeType.PAYMENT,         'Payment Service', { x: 1840, y: 200 });
  repository.addNode(NodeType.WORKER,          'Workers',         { x: 1840, y: 560 });
  repository.addNode(NodeType.EMAIL,           'Email Service',   { x: 1840, y: 780 });
  repository.addNode(NodeType.STORAGE,         'S3 Storage',      { x: 2060, y: 460 });
  repository.addNode(NodeType.MONITOR,         'Monitoring',      { x: 1180, y: 560 });

  const nodes = repository.getAllNodes();
  const [
    client, dns, cdn, waf, lb, cb, gw, auth,
    app1, app2, microSvc, cache, db, search, queue,
    payment, worker, email, storage, monitor,
  ] = nodes;

  if (!client || !gw) return;

  // ── Edges ────────────────────────────────────────────────────────────────────
  const edges: Array<{
    sourceId:    string;
    targetId:    string;
    protocol:    EdgeProtocol;
    isEncrypted?: boolean;
  }> = [
    // ── Internet ingress
    { sourceId: client.id,  targetId: dns.id,     protocol: EdgeProtocol.HTTPS, isEncrypted: true  },
    { sourceId: client.id,  targetId: cdn.id,     protocol: EdgeProtocol.HTTPS, isEncrypted: true  },
    { sourceId: dns.id,     targetId: waf.id,     protocol: EdgeProtocol.HTTPS, isEncrypted: true  },
    { sourceId: cdn.id,     targetId: lb.id,      protocol: EdgeProtocol.HTTPS, isEncrypted: true  },
    { sourceId: waf.id,     targetId: lb.id,      protocol: EdgeProtocol.HTTPS, isEncrypted: true  },

    // ── Core path with circuit breaker
    { sourceId: lb.id,      targetId: cb.id,      protocol: EdgeProtocol.HTTP                      },
    { sourceId: cb.id,      targetId: gw.id,      protocol: EdgeProtocol.HTTP                      },

    // ── API Gateway fan-out
    { sourceId: gw.id,      targetId: auth.id,    protocol: EdgeProtocol.GRPC                      },
    { sourceId: gw.id,      targetId: app1.id,    protocol: EdgeProtocol.HTTP                      },
    { sourceId: gw.id,      targetId: app2.id,    protocol: EdgeProtocol.HTTP                      },
    { sourceId: gw.id,      targetId: microSvc.id,protocol: EdgeProtocol.GRPC                      },

    // ── App Servers → data tier
    { sourceId: app1.id,    targetId: cache.id,   protocol: EdgeProtocol.REDIS                     },
    { sourceId: app2.id,    targetId: cache.id,   protocol: EdgeProtocol.REDIS                     },
    { sourceId: app1.id,    targetId: db.id,      protocol: EdgeProtocol.TCP                       },
    { sourceId: app2.id,    targetId: db.id,      protocol: EdgeProtocol.TCP                       },
    { sourceId: app1.id,    targetId: search.id,  protocol: EdgeProtocol.HTTP                      },
    { sourceId: app2.id,    targetId: search.id,  protocol: EdgeProtocol.HTTP                      },
    { sourceId: app1.id,    targetId: queue.id,   protocol: EdgeProtocol.AMQP                      },
    { sourceId: app2.id,    targetId: queue.id,   protocol: EdgeProtocol.AMQP                      },

    // ── Payment (touches its own DB)
    { sourceId: app1.id,    targetId: payment.id, protocol: EdgeProtocol.HTTPS, isEncrypted: true  },
    { sourceId: payment.id, targetId: db.id,      protocol: EdgeProtocol.TCP                       },

    // ── Microservice → DB
    { sourceId: microSvc.id,targetId: db.id,      protocol: EdgeProtocol.TCP                       },

    // ── Async jobs
    { sourceId: queue.id,   targetId: worker.id,  protocol: EdgeProtocol.AMQP                      },
    { sourceId: worker.id,  targetId: storage.id, protocol: EdgeProtocol.HTTPS                     },
    { sourceId: worker.id,  targetId: email.id,   protocol: EdgeProtocol.HTTPS                     },

    // ── Observability
    { sourceId: monitor.id, targetId: gw.id,      protocol: EdgeProtocol.HTTP                      },
    { sourceId: monitor.id, targetId: app1.id,    protocol: EdgeProtocol.HTTP                      },
  ];

  for (const edge of edges) {
    repository.addEdge(edge);
  }
}
