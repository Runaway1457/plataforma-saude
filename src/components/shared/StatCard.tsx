// ============================================================
// StatCard Component - Statistics display card
// ============================================================

'use client';

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

const variantStyles = {
  default: 'bg-white hover:bg-slate-50',
  primary: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
  success: 'bg-green-50 hover:bg-green-100 border-green-200',
  warning: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
  danger: 'bg-red-50 hover:bg-red-100 border-red-200',
};

const iconBgStyles = {
  default: 'bg-slate-100',
  primary: 'bg-blue-100',
  success: 'bg-green-100',
  warning: 'bg-amber-100',
  danger: 'bg-red-100',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  variant = 'default',
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'transition-all duration-200 cursor-pointer border',
        variantStyles[variant],
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            {subtitle && (
              <p className="text-xs text-slate-400">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-1">
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend === 'up' && 'text-green-600',
                    trend === 'down' && 'text-red-600',
                    trend === 'stable' && 'text-slate-500'
                  )}
                >
                  {trend === 'up' && '↑'}
                  {trend === 'down' && '↓'}
                  {trend === 'stable' && '→'}
                  {' '}{trendValue}
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className={cn('p-2 rounded-lg', iconBgStyles[variant])}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
