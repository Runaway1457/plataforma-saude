// ============================================================
// POPULATION HEALTH MODULE - Main Component
// ============================================================

'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  Building2, 
  AlertTriangle, 
  TrendingUp, 
  MapPin,
  Activity,
  Loader2,
  Brain,
  BarChart3,
  Lightbulb,
  FileText
} from 'lucide-react';
import { RegionalDashboard } from './RegionalDashboard';
import { RiskMap } from './RiskMap';
import { IndicatorsChart } from './IndicatorsChart';
import { RecommendationsList } from './RecommendationsList';
import { NarrativeSummary } from './NarrativeSummary';

interface Region {
  id: string;
  code: string;
  name: string;
  state: string;
  population: number | null;
  _count: { municipalities: number; facilities: number };
  averageRiskScore?: number;
}

export function PopulationHealthModule() {
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Fetch regions
  const { data: regionsData, isLoading: loadingRegions } = useQuery<{
    regions: Region[];
  }>({
    queryKey: ['regions'],
    queryFn: async () => {
      const res = await fetch('/api/pophealth/regions');
      if (!res.ok) throw new Error('Failed to fetch regions');
      return res.json();
    },
  });

  // Fetch dashboard data
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery({
    queryKey: ['dashboard', selectedRegionId],
    queryFn: async () => {
      const url = selectedRegionId 
        ? `/api/pophealth/dashboard?regionId=${selectedRegionId}`
        : '/api/pophealth/dashboard';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
  });

  // AI Analysis mutation
  const analysisMutation = useMutation({
    mutationFn: async (regionId: string) => {
      const res = await fetch('/api/pophealth/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionId }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      return res.json();
    },
  });

  const regions = regionsData?.regions || [];

  return (
    <div className="space-y-6">
      {/* Region Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-500">
                Regional de Saúde:
              </label>
              <Select
                value={selectedRegionId || 'all'}
                onValueChange={(v) => setSelectedRegionId(v === 'all' ? null : v)}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Selecione uma regional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Regionais</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRegionId && (
              <Button
                onClick={() => analysisMutation.mutate(selectedRegionId)}
                disabled={analysisMutation.isPending}
              >
                {analysisMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4 mr-2" />
                )}
                Gerar Análise IA
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {dashboardData && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">População Total</p>
                  <p className="text-2xl font-bold">
                    {(dashboardData.statistics?.totalPopulation || 0).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Municípios</p>
                  <p className="text-2xl font-bold">
                    {dashboardData.statistics?.totalMunicipalities || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Estabelecimentos</p>
                  <p className="text-2xl font-bold">
                    {dashboardData.statistics?.totalFacilities || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Áreas de Risco Alto</p>
                  <p className="text-2xl font-bold">
                    {dashboardData.statistics?.riskDistribution?.HIGH || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="map">
            <MapPin className="w-4 h-4 mr-2" />
            Mapa de Risco
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Lightbulb className="w-4 h-4 mr-2" />
            Recomendações
          </TabsTrigger>
          <TabsTrigger value="narrative">
            <FileText className="w-4 h-4 mr-2" />
            Análise IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          {loadingDashboard ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <RegionalDashboard data={dashboardData} />
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <RiskMap data={dashboardData} />
        </TabsContent>

        <TabsContent value="recommendations" className="mt-6">
          <RecommendationsList recommendations={dashboardData?.recommendations || []} />
        </TabsContent>

        <TabsContent value="narrative" className="mt-6">
          <NarrativeSummary 
            analysis={analysisMutation.data}
            isLoading={analysisMutation.isPending}
            regionId={selectedRegionId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
