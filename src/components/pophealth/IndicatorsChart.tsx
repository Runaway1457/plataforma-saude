// ============================================================
// INDICATORS CHART COMPONENT
// ============================================================

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface IndicatorsChartProps {
  data: {
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
    }>;
    statistics?: {
      riskDistribution: Record<string, number>;
    };
  } | undefined;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function IndicatorsChart({ data }: IndicatorsChartProps) {
  if (!data) return null;

  // Prepare data for charts
  const morbidityIndicators = (data.indicators?.morbidity || []).slice(0, 6);
  const coverageIndicators = (data.indicators?.coverage || []).slice(0, 6);

  // Risk distribution for pie chart
  const riskDistributionData = Object.entries(data.statistics?.riskDistribution || {}).map(
    ([name, value]) => ({
      name: name === 'VERY_LOW' ? 'Muito Baixo' :
            name === 'LOW' ? 'Baixo' :
            name === 'MODERATE' ? 'Moderado' :
            name === 'HIGH' ? 'Alto' :
            name === 'VERY_HIGH' ? 'Muito Alto' : 'Crítico',
      value,
    })
  );

  // Risk profiles for bar chart
  const riskProfilesData = (data.riskProfiles || []).slice(0, 6).map(rp => ({
    name: rp.category,
    score: rp.riskScore,
    level: rp.riskLevel,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Morbidity Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indicadores de Morbidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={morbidityIndicators} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="indicatorName" 
                  type="category" 
                  width={120}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value} ${morbidityIndicators.find(i => i.indicatorName === name)?.unit || ''}`,
                    'Valor'
                  ]}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Coverage Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indicadores de Cobertura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coverageIndicators}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="indicatorName" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Risk Distribution Pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição de Risco</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskDistributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Risk Profiles Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score de Risco por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskProfilesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" name="Score de Risco" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
