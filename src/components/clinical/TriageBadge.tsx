// ============================================================
// TRIAGE BADGE COMPONENT
// ============================================================

import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  CheckCircle,
  Activity
} from 'lucide-react';

interface TriageBadgeProps {
  priority: string;
  size?: 'sm' | 'md' | 'lg';
}

const priorityConfig: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string; 
  borderColor: string;
  icon: React.ReactNode;
  pulse?: boolean;
}> = {
  IMMEDIATE: {
    label: 'Emergência Imediata',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: <AlertTriangle className="w-4 h-4" />,
    pulse: true,
  },
  URGENT: {
    label: 'Urgente',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  HIGH: {
    label: 'Alta Prioridade',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    icon: <Clock className="w-4 h-4" />,
  },
  MODERATE: {
    label: 'Prioridade Moderada',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    icon: <Activity className="w-4 h-4" />,
  },
  ROUTINE: {
    label: 'Rotina',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  LOW: {
    label: 'Baixa Prioridade',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    icon: <CheckCircle className="w-4 h-4" />,
  },
};

export function TriageBadge({ priority, size = 'md' }: TriageBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig['ROUTINE'];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <div 
      className={`
        inline-flex items-center gap-2 rounded-full border font-medium
        ${config.color} ${config.bgColor} ${config.borderColor}
        ${sizeClasses[size]}
        ${config.pulse ? 'animate-pulse' : ''}
      `}
    >
      {config.icon}
      {config.label}
    </div>
  );
}
