'use client';

import { createContext, useContext, useState, useId } from 'react';

// ==========================================================================
// Tabs Component
// Accessible tabbed interface
// ==========================================================================

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

// ==========================================================================
// Tabs Root
// ==========================================================================

interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className = '',
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const baseId = useId();

  const activeTab = value ?? internalValue;
  const setActiveTab = (newValue: string) => {
    if (!value) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// ==========================================================================
// Tabs List
// ==========================================================================

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
}

export function TabsList({ children, className = '', variant = 'default' }: TabsListProps) {
  const variantStyles = {
    default:
      'flex gap-1 rounded-lg bg-bg-tertiary p-1',
    pills:
      'flex flex-wrap gap-2',
    underline:
      'flex border-b border-border-subtle',
  };

  return (
    <div role="tablist" className={`${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  );
}

// ==========================================================================
// Tab Trigger
// ==========================================================================

interface TabTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabTrigger({
  value,
  children,
  className = '',
  disabled = false,
}: TabTriggerProps) {
  const { activeTab, setActiveTab, baseId } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => setActiveTab(value)}
      className={`
        px-4 py-2 text-sm font-medium rounded-md transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
          isActive
            ? 'bg-bg-secondary text-text-primary shadow-sm'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary/50'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// ==========================================================================
// Tab Content
// ==========================================================================

interface TabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  forceMount?: boolean;
}

export function TabContent({
  value,
  children,
  className = '',
  forceMount = false,
}: TabContentProps) {
  const { activeTab, baseId } = useTabsContext();
  const isActive = activeTab === value;

  if (!isActive && !forceMount) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      hidden={!isActive}
      tabIndex={0}
      className={`mt-4 focus:outline-none ${className}`}
    >
      {children}
    </div>
  );
}

// ==========================================================================
// Simple Tabs (All-in-one component)
// ==========================================================================

interface SimpleTabsProps {
  tabs: Array<{
    value: string;
    label: string;
    content: React.ReactNode;
    disabled?: boolean;
  }>;
  defaultValue?: string;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
}

export function SimpleTabs({
  tabs,
  defaultValue,
  className = '',
  variant = 'default',
}: SimpleTabsProps) {
  const firstEnabled = tabs.find((t) => !t.disabled)?.value ?? tabs[0]?.value ?? '';
  const resolvedDefault = defaultValue ?? firstEnabled;

  if (!resolvedDefault) {
    return null; // No tabs to render
  }

  return (
    <Tabs defaultValue={resolvedDefault} className={className}>
      <TabsList variant={variant}>
        {tabs.map((tab) => (
          <TabTrigger key={tab.value} value={tab.value} disabled={tab.disabled}>
            {tab.label}
          </TabTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabContent>
      ))}
    </Tabs>
  );
}
