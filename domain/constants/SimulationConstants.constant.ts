/**
 * SimulationConstants — all numeric simulation parameters in one place.
 * Never scatter magic numbers across the codebase.
 */
export const SimulationConstants = {
  // Tick interval in milliseconds
  TICK_INTERVAL_MS: 500,

  // Low-pass filter coefficient for metric smoothing (0 = no change, 1 = instant)
  SMOOTHING_ALPHA: 0.3,

  // CPU threshold percentages
  CPU_OVERLOAD_THRESHOLD: 95,
  CPU_DEGRADED_THRESHOLD: 70,

  // Error rate threshold percentages
  ERROR_DEGRADED_THRESHOLD: 10,

  // History ring buffer length
  MAX_HISTORY_POINTS: 60,

  // Base cost per hour multiplier (per replica)
  COST_PER_HOUR_BY_TYPE: {
    client:         0,
    dns:            0.01,
    cdn:            0.08,
    waf:            0.05,
    loadbalancer:   0.02,
    apigateway:     0.04,
    appserver:      0.10,
    microservice:   0.08,
    cache:          0.06,
    database:       0.15,
    queue:          0.04,
    worker:         0.07,
    storage:        0.02,
    servicemesh:    0.03,
    circuitbreaker: 0.01,
    search:         0.12,
    monitor:        0.05,
    auth:           0.03,
    email:          0.02,
    payment:        0.05,
  } as Record<string, number>,

  // Base latency in ms for each node type
  BASE_LATENCY_MS_BY_TYPE: {
    client:         0,
    dns:            10,
    cdn:            5,
    waf:            3,
    loadbalancer:   1,
    apigateway:     8,
    appserver:      20,
    microservice:   15,
    cache:          1,
    database:       10,
    queue:          5,
    worker:         30,
    storage:        8,
    servicemesh:    2,
    circuitbreaker: 1,
    search:         15,
    monitor:        2,
    auth:           12,
    email:          50,
    payment:        100,
  } as Record<string, number>,

  // Visual accent colors per node type
  COLOR_BY_TYPE: {
    client:         '#6366f1',
    dns:            '#8b5cf6',
    cdn:            '#3b82f6',
    waf:            '#ef4444',
    loadbalancer:   '#f59e0b',
    apigateway:     '#10b981',
    appserver:      '#06b6d4',
    microservice:   '#14b8a6',
    cache:          '#f97316',
    database:       '#a855f7',
    queue:          '#eab308',
    worker:         '#84cc16',
    storage:        '#64748b',
    servicemesh:    '#22d3ee',
    circuitbreaker: '#fb923c',
    search:         '#e879f9',
    monitor:        '#34d399',
    auth:           '#f43f5e',
    email:          '#94a3b8',
    payment:        '#4ade80',
  } as Record<string, string>,

  // Lucide icon name per node type
  ICON_BY_TYPE: {
    client:         'Users',
    dns:            'Globe',
    cdn:            'Globe2',
    waf:            'Shield',
    loadbalancer:   'Shuffle',
    apigateway:     'Layers',
    appserver:      'Server',
    microservice:   'Box',
    cache:          'Zap',
    database:       'Database',
    queue:          'Layers3',
    worker:         'Cpu',
    storage:        'HardDrive',
    servicemesh:    'Network',
    circuitbreaker: 'CircleDashed',
    search:         'Search',
    monitor:        'Activity',
    auth:           'KeyRound',
    email:          'Mail',
    payment:        'CreditCard',
  } as Record<string, string>,

  // Layout constants for auto-layout algorithm
  LAYOUT: {
    LAYER_GAP_X:  220,
    NODE_GAP_Y:   140,
    START_X:       80,
    START_Y:       80,
    CENTER_HEIGHT: 300,
  },

  // Node type → layout layer (lower = left/upstream)
  LAYOUT_LAYER_BY_TYPE: {
    client:         0,
    dns:            1,
    cdn:            1,
    waf:            2,
    loadbalancer:   3,
    apigateway:     4,
    circuitbreaker: 4,
    appserver:      5,
    microservice:   5,
    auth:           5,
    servicemesh:    5,
    cache:          6,
    database:       6,
    queue:          6,
    search:         6,
    worker:         7,
    storage:        7,
    monitor:        7,
    email:          8,
    payment:        8,
  } as Record<string, number>,
} as const;
