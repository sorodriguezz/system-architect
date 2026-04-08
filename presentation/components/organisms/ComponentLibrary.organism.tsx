'use client';
import React, { useState } from 'react';
import { COMPONENT_REGISTRY, ALL_CATEGORIES } from '@/domain/constants/ComponentRegistry.constant';
import { ComponentCategory } from '@/domain/constants/NodeTypes.constant';
import { SimulationConstants } from '@/domain/constants/SimulationConstants.constant';
import * as Icons from 'lucide-react';

interface ComponentLibraryProps {
  onDragStart: (event: React.DragEvent, type: string) => void;
}

const CATEGORY_LABELS: Partial<Record<ComponentCategory, string>> = {
  'Traffic & Edge': 'Traffic',
};

export function ComponentLibrary({ onDragStart }: ComponentLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Traffic & Edge');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredComponents = COMPONENT_REGISTRY.filter(c => {
    const matchesCategory = activeCategory === 'All' || c.category === activeCategory;
    const matchesSearch   = !searchQuery
      || c.label.toLowerCase().includes(searchQuery.toLowerCase())
      || c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full">
      <LibraryHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <CategoryTabs
        categories={ALL_CATEGORIES}
        active={activeCategory}
        onSelect={setActiveCategory}
      />

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredComponents.map(component => (
          <ComponentCard key={component.type} component={component} onDragStart={onDragStart} />
        ))}
        {filteredComponents.length === 0 && (
          <p className="text-center text-white/30 text-xs py-6">No components found</p>
        )}
      </div>

      <footer className="p-2 border-t border-white/5">
        <p className="text-white/25 text-xs text-center">Drag to canvas to add</p>
      </footer>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function LibraryHeader({ searchQuery, onSearchChange }: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
}) {
  return (
    <div className="p-3 border-b border-white/5">
      <h2 className="text-white/90 font-semibold text-sm mb-2 flex items-center gap-2">
        <Icons.Boxes size={14} className="text-indigo-400" />
        Components
      </h2>
      <div className="relative">
        <Icons.Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="search"
          placeholder="Search components..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white/80 placeholder-white/30 focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>
    </div>
  );
}

function CategoryTabs({ categories, active, onSelect }: {
  categories: ReadonlyArray<ComponentCategory>;
  active: string;
  onSelect: (cat: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-white/5">
      {(['All', ...categories] as string[]).map(cat => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
            active === cat
              ? 'bg-indigo-500/80 text-white'
              : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
          }`}
        >
          {CATEGORY_LABELS[cat as ComponentCategory] ?? cat}
        </button>
      ))}
    </div>
  );
}

function ComponentCard({ component, onDragStart }: {
  component: (typeof COMPONENT_REGISTRY)[number];
  onDragStart: (e: React.DragEvent, type: string) => void;
}) {
  const color    = SimulationConstants.COLOR_BY_TYPE[component.type] || '#6366f1';
  const iconName = SimulationConstants.ICON_BY_TYPE[component.type]  || 'Server';
  const IconComp = (Icons as Record<string, any>)[iconName];

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, component.type)}
      className="flex items-center gap-2.5 p-2.5 rounded-lg border border-white/5 bg-white/2 hover:bg-white/8 hover:border-white/15 cursor-grab active:cursor-grabbing transition-all group"
      title={component.description}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22`, border: `1px solid ${color}33` }}>
        {IconComp && <IconComp size={15} style={{ color }} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-white/90 text-xs font-medium truncate">{component.label}</div>
        <div className="text-white/35 text-xs truncate leading-tight">{component.description}</div>
      </div>

      <Icons.GripVertical size={12} className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
