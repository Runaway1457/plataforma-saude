// ============================================================
// AlertBanner Component - Alert display banner
// ============================================================

'use client';

import { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Info, CheckCircle, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AlertVariant = 'critical' | 'warning' | 'info' | 'success' | 'error';

interface AlertBannerProps {
  variant?: AlertVariant;
  title: string;
  description?: string;
  icon?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: ReactNode;
  className?: string;
}

const variantConfig: Record<AlertVariant, {
  className: string;
  icon: ReactNode;
}> = {
  critical: {
    className: 'border-red-300 bg-red-50 text-red-800 [&>svg]:text-red-500',
    icon: <XCircle className="w-5 h-5" />,
  },
  warning: {
    className: 'border-amber-300 bg-amber-50 text-amber-800 [&>svg]:text-amber-500',
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  info: {
    className: 'border-blue-300 bg-blue-50 text-blue-800 [&>svg]:text-blue-500',
    icon: <Info className="w-5 h-5" />,
  },
  success: {
    className: 'border-green-300 bg-green-50 text-green-800 [&>svg]:text-green-500',
    icon: <CheckCircle className="w-5 h-5" />,
  },
  error: {
    className: 'border-red-300 bg-red-50 text-red-800 [&>svg]:text-red-500',
    icon: <AlertCircle className="w-5 h-5" />,
  },
};

export function AlertBanner({
  variant = 'info',
  title,
  description,
  icon,
  dismissible,
  onDismiss,
  action,
  className,
}: AlertBannerProps) {
  const config = variantConfig[variant];

  return (
    <Alert className={cn(config.className, 'relative', className)}>
      {icon || config.icon}
      <div className="flex-1">
        <AlertTitle className="font-semibold">{title}</AlertTitle>
        {description && (
          <AlertDescription className="mt-1">{description}</AlertDescription>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {dismissible && onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-70 hover:opacity-100"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </Alert>
  );
}

// Red Flag Alert - Specialized for clinical warnings
interface RedFlagAlertProps {
  flags: Array<{
    id: string;
    type: string;
    description: string;
    severity: 'critical' | 'high' | 'moderate';
    recommendation?: string;
  }>;
}

export function RedFlagAlert({ flags }: RedFlagAlertProps) {
  if (flags.length === 0) return null;

  const criticalFlags = flags.filter(f => f.severity === 'critical');
  const highFlags = flags.filter(f => f.severity === 'high');
  const otherFlags = flags.filter(f => f.severity === 'moderate');

  return (
    <div className="space-y-3">
      {criticalFlags.length > 0 && (
        <Alert className="border-red-500 bg-red-50 animate-pulse">
          <XCircle className="w-5 h-5 text-red-600" />
          <AlertTitle className="text-red-800 font-bold">
            🚨 ALERTA CRÍTICO - Atenção Imediata Necessária
          </AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="space-y-2">
              {criticalFlags.map((flag) => (
                <li key={flag.id} className="flex flex-col">
                  <span className="font-medium text-red-700">{flag.description}</span>
                  {flag.recommendation && (
                    <span className="text-sm text-red-600 mt-0.5">{flag.recommendation}</span>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {highFlags.length > 0 && (
        <Alert className="border-orange-400 bg-orange-50">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <AlertTitle className="text-orange-800 font-semibold">
            ⚠️ Atenção - Sinais de Alerta
          </AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="space-y-1">
              {highFlags.map((flag) => (
                <li key={flag.id} className="text-orange-700">
                  • {flag.description}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {otherFlags.length > 0 && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <Info className="w-5 h-5 text-yellow-500" />
          <AlertTitle className="text-yellow-800 font-medium">
            Observações Importantes
          </AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="space-y-1">
              {otherFlags.map((flag) => (
                <li key={flag.id} className="text-yellow-700">
                  • {flag.description}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
