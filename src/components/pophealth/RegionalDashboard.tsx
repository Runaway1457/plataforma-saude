// ============================================================
// REGIONAL DASHBOARD COMPONENT
// ============================================================

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  Heart,
  Shield,
  Users
} from 'lucide-react';

interface DashboardData {
  regions?: Array<{
    id: string;
    name: string;
    population: number | null;
    _count: { municipalities: number; facilities: number };
  }>;
  indicators?: Record<string, Array<{
    indicatorCode: string;
    indicatorName: string;
    value: number;
    unit: string | null;
    period: string;
  }>>;
  riskProfiles?: Array<{
    category: string;
    riskScore: number;
    riskLevel: string;
    trendDirection: string | null;
    modelConfidence: number | null;
  }>;
  statistics?: {
    riskDistribution: Record<string, number>;
    topRiskAreas: Array<{
      municipalityId: string;
      riskScore: number;
      riskLevel: string;
    }>;
  };
}

interface RegionalDashboardProps {
  data: DashboardData | undefined;
}

const riskColors: Record<string, string> = {
  VERY_LOW: 'bg-green-500',
  LOW: 'bg-lime-500',
  MODERATE: 'bg-yellow-500',
  HIGH: 'bg-orange-500',
  VERY_HIGH: 'bg-red-500',
  CRITICAL: 'bg-red-700',
};

const riskLabels: Record<string, string> = {
  VERY_LOW: 'Muito Baixo',
  LOW: 'Baixo',
  MODERATE: 'Moderado',
  HIGH: 'Alto',
  VERY_HIGH: 'Muito Alto',
  CRITICAL: 'Crítico',
};

export function RegionalDashboard({ data }: RegionalDashboardProps) {
  if (!data) return null;

  const riskDistribution = data.statistics?.riskDistribution || {};
  const totalRisk = Object.values(riskDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Risk Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Distribuição de Risco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(riskDistribution).map(([level, count]) => (
              <div key={level} className="flex items-center gap-4">
                <div className="w-32">
                  <Badge 
                    variant="outline" 
                    className={`${riskColors[level]} text-white border-0`}
                  >
                    {riskLabels[level] || level}
                  </Badge>
                </div>
                <div className="flex-1">
                  <Progress 
                    value={totalRisk > 0 ? (count / totalRisk) * 100 : 0} 
                    className="h-2"
                  />
                </div>
                <div className="w-12 text-right text-sm text-slate-500">
                  {count}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Profiles by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Perfis de Risco por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.riskProfiles?.slice(0, 5).map((profile, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{profile.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">
                      Score: {profile.riskScore}
                    </span>
                    {profile.trendDirection === 'increasing' && (
                      <TrendingUp className="w-4 h-4 text-red-500" />
                    )}
                    {profile.trendDirection === 'decreasing' && (
                      <TrendingDown className="w-4 h-4 text-green-500" />
                    )}
                    {profile.trendDirection === 'stable' && (
                      <Minus className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
                <Progress 
                  value={profile.riskScore} 
                  className={`h-2 ${riskColors[profile.riskLevel]}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Indicadores-Chave
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(data.indicators || {}).slice(0, 4).map(([category, indicators]) => (
              <div key={category} className="border-b pb-2 last:border-0">
                <h4 className="text-sm font-medium text-slate-500 capitalize mb-1">
                  {category}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {indicators?.slice(0, 2).map((ind, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 truncate">
                        {ind.indicatorName.split(' ').slice(0, 3).join(' ')}...
                      </span>
                      <Badge variant="secondary">
                        {ind.value} {ind.unit || ''}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regions Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Regionais de Saúde
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.regions?.map((region) => (
              <div key={region.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium">{region.name}</p>
                  <p className="text-sm text-slate-500">
                    Pop: {(region.population || 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {region._count.municipalities} municípios
                  </Badge>
                  <Badge variant="outline">
                    {region._count.facilities} estabelecimentos
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
