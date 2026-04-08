'use client';
import React, { useState } from 'react';
import { COMPONENT_REGISTRY, ALL_CATEGORIES } from '@/domain/constants/ComponentRegistry.constant';
import { ComponentCategory } from '@/domain/constants/NodeTypes.constant';
import { SimulationConstants } from '@/domain/constants/SimulationConstants.constant';
import * as Icons from 'lucide-react';

interface ComponentLibraryProps {
  onDragStart: (event: React.DragEvent, type: string) => void;
}

const CAT_SHORT: Partial<Record<ComponentCategory, string>> = {
  'Traffic & Edge': 'Traffic',
};

function getCategoryIcon(cat: ComponentCategory) {
  const map: Partial<Record<ComponentCategory, keyof typeof Icons>> = {
    'Traffic & Edge': 'Globe',
    Compute:          'Cpu',
    Storage:          'Database',
    Messaging:        'MessageSquare',
    Security:         'Shield',
    Observability:    'BarChart2',
    Services:         'Package',
  };
  const IconName = map[cat] ?? 'Box';
  const IconComp = (Icons as any)[IconName];
  return IconComp ? <IconComp size={10} /> : null;
}

export function ComponentLibrary({ onDragStart }: ComponentLibraryProps) {
  // Default to 'All' so every component is visible on first load
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery,    setSearchQuery]     = useState('');

  const filteredComponents = COMPONENT_REGISTRY.filter(c => {
    const matchesCat    = activeCategory === 'All' || c.category === activeCategory;
    const q             = searchQuery.toLowerCase();
    const matchesSearch = !q
      || c.label.toLowerCase().includes(q)
      || c.description.toLowerCase().includes(q)
      || c.type.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.2)' }}>
            <Icons.Boxes size={11} color="#818cf8" />
          </div>
          <h2 style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600 }}>
            Components
          </h2>
          <span
            className="ml-auto rounded-full px-1.5 py-0.5 text-xs font-mono"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: 10 }}
          >
            {filteredComponents.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Icons.Search size={11} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
          <input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              paddingLeft: 28,
              paddingRight: 10,
              paddingTop: 5,
              paddingBottom: 5,
              fontSize: 11,
              color: 'rgba(255,255,255,0.75)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="px-2 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex flex-wrap gap-1">
          {(['All', ...ALL_CATEGORIES] as string[]).map(cat => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="flex items-center gap-1 rounded-md transition-all"
                style={{
                  padding: '3px 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  background:   isActive ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                  border:       `1px solid ${isActive ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  color:        isActive ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
                  cursor:       'pointer',
                }}
              >
                {cat !== 'All' && getCategoryIcon(cat as ComponentCategory)}
                {CAT_SHORT[cat as ComponentCategory] ?? cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Component list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
        <div className="space-y-1">
          {filteredComponents.map(c => (
            <ComponentCard key={c.type} component={c} onDragStart={onDragStart} />
          ))}
          {filteredComponents.length === 0 && (
            <div className="text-center py-8" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
              <Icons.SearchX size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              No components found
            </div>
          )}
        </div>
      </div>

      <div className="px-3 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, textAlign: 'center' }}>
          Drag & drop onto canvas
        </p>
      </div>
    </div>
  );
}

function ComponentCard({ component, onDragStart }: {
  component: (typeof COMPONENT_REGISTRY)[number];
  onDragStart: (e: React.DragEvent, type: string) => void;
}) {
  const color    = SimulationConstants.COLOR_BY_TYPE[component.type] || '#6366f1';
  const iconName = SimulationConstants.ICON_BY_TYPE[component.type]  || 'Server';
  const IconComp = (Icons as any)[iconName];

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, component.type)}
      className="flex items-center gap-2.5 rounded-lg cursor-grab active:cursor-grabbing group transition-all"
      style={{
        padding: '8px 10px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
      title={component.description}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = `${color}12`;
        (e.currentTarget as HTMLElement).style.borderColor = `${color}35`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)';
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0 flex items-center justify-center rounded-lg w-8 h-8"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        {IconComp && <IconComp size={14} style={{ color }} />}
      </div>

      {/* Labels */}
      <div className="flex-1 min-w-0">
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 600, marginBottom: 1 }}>
          {component.label}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, lineHeight: 1.4 }}
          className="line-clamp-1 truncate">
          {component.description}
        </div>
      </div>

      {/* Cost badge */}
      {component.baseCostPerHour > 0 && (
        <div
          className="flex-shrink-0 text-xs font-mono rounded px-1"
          style={{ color: '#4ade80', fontSize: 9, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}
        >
          ${component.baseCostPerHour}/h
        </div>
      )}
    </div>
  );
}
