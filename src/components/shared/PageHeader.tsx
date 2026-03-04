// ============================================================
// PageHeader Component - Reusable page header with title and actions
// ============================================================

'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
}

export function PageHeader({ title, description, icon, actions, badge }: PageHeaderProps) {
  return (
    <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-white">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 bg-blue-50 rounded-lg">
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-semibold text-slate-800">{title}</CardTitle>
                {badge}
              </div>
              {description && (
                <CardDescription className="text-slate-500 mt-1">{description}</CardDescription>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </CardHeader>
    </Card>
  );
}
