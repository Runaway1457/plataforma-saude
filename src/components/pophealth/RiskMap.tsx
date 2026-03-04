// ============================================================
// RISK MAP COMPONENT
// ============================================================

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin,
  AlertTriangle
} from 'lucide-react';

interface RiskMapProps {
  data: {
    regions?: Array<{
      id: string;
      name: string;
      municipalities?: Array<{
        id: string;
        name: string;
        population: number | null;
        riskProfiles: Array<{
          riskScore: number;
          riskLevel: string;
        }>;
      }>;
    }>;
    riskProfiles?: Array<{
      municipalityId: string | null;
      riskScore: number;
      riskLevel: string;
      category: string;
    }>;
  } | undefined;
}

const riskColors: Record<string, string> = {
  VERY_LOW: 'bg-green-400',
  LOW: 'bg-lime-400',
  MODERATE: 'bg-yellow-400',
  HIGH: 'bg-orange-400',
  VERY_HIGH: 'bg-red-400',
  CRITICAL: 'bg-red-600',
};

const riskBorderColors: Record<string, string> = {
  VERY_LOW: 'border-green-500',
  LOW: 'border-lime-500',
  MODERATE: 'border-yellow-500',
  HIGH: 'border-orange-500',
  VERY_HIGH: 'border-red-500',
  CRITICAL: 'border-red-700',
};

export function RiskMap({ data }: RiskMapProps) {
  if (!data) return null;

  // Collect all municipalities with risk data
  const municipalitiesWithRisk: Array<{
    name: string;
    riskScore: number;
    riskLevel: string;
    regionName: string;
  }> = [];

  data.regions?.forEach(region => {
    region.municipalities?.forEach(muni => {
      if (muni.riskProfiles && muni.riskProfiles.length > 0) {
        municipalitiesWithRisk.push({
          name: muni.name,
          riskScore: muni.riskProfiles[0].riskScore,
          riskLevel: muni.riskProfiles[0].riskLevel,
          regionName: region.name,
        });
      }
    });
  });

  // Sort by risk score
  municipalitiesWithRisk.sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Visual Map Representation */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Mapa de Risco Territorial
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simple grid-based map visualization */}
          <div className="grid grid-cols-5 gap-2 p-4 bg-slate-100 rounded-lg">
            {municipalitiesWithRisk.map((muni, index) => (
              <div
                key={index}
                className={`
                  aspect-square rounded-lg border-2 ${riskBorderColors[muni.riskLevel]}
                  ${riskColors[muni.riskLevel]} 
                  flex flex-col items-center justify-center p-2
                  cursor-pointer hover:scale-105 transition-transform
                `}
                title={`${muni.name}: Score ${muni.riskScore}`}
              >
                <span className="text-xs font-bold text-white text-center truncate w-full">
                  {muni.name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-white/80">
                  {muni.riskScore}
                </span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
            {Object.entries(riskColors).map(([level, color]) => (
              <div key={level} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${color}`} />
                <span className="text-xs text-slate-600">
                  {level === 'VERY_LOW' ? 'Muito Baixo' :
                   level === 'LOW' ? 'Baixo' :
                   level === 'MODERATE' ? 'Moderado' :
                   level === 'HIGH' ? 'Alto' :
                   level === 'VERY_HIGH' ? 'Muito Alto' : 'Crítico'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-5 h-5" />
            Áreas de Maior Risco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {municipalitiesWithRisk.slice(0, 8).map((muni, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg bg-slate-50"
              >
                <div className={`
                  w-8 h-8 rounded-full ${riskColors[muni.riskLevel]}
                  flex items-center justify-center text-white font-bold text-sm
                `}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{muni.name}</p>
                  <p className="text-xs text-slate-500">{muni.regionName}</p>
                </div>
                <Badge 
                  variant="outline"
                  className={`
                    ${riskBorderColors[muni.riskLevel]}
                    ${riskColors[muni.riskLevel]} text-white border-0
                  `}
                >
                  {muni.riskScore}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
