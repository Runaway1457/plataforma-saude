// ============================================================
// RECOMMENDATIONS LIST COMPONENT
// ============================================================

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Lightbulb,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

interface Recommendation {
  id: string;
  recommendationType: string;
  title: string;
  description: string;
  rationale: string | null;
  targetIndicator: string | null;
  expectedImpact: string | null;
  confidenceLevel: number | null;
  priority: number | null;
  status: string;
  createdAt: string;
}

interface RecommendationsListProps {
  recommendations: Recommendation[];
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4" /> },
  IN_PROGRESS: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800', icon: <TrendingUp className="w-4 h-4" /> },
  COMPLETED: { label: 'Concluída', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="w-4 h-4" /> },
  DISMISSED: { label: 'Descartada', color: 'bg-slate-100 text-slate-800', icon: <AlertCircle className="w-4 h-4" /> },
};

const typeLabels: Record<string, string> = {
  prevention_campaign: 'Campanha de Prevenção',
  active_search: 'Busca Ativa',
  capacity_enhancement: 'Reforço de Capacidade',
  resource_redistribution: 'Redistribuição de Recursos',
  prioritization: 'Priorização de Acompanhamento',
  education: 'Educação em Saúde',
};

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-slate-500">
            <Lightbulb className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Nenhuma recomendação disponível.</p>
            <p className="text-sm mt-2">
              Selecione uma regional e clique em "Gerar Análise IA" para obter recomendações.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold">{recommendations.length}</p>
              </div>
              <div className="border-l pl-4">
                <p className="text-sm text-slate-500">Pendentes</p>
                <p className="text-2xl font-bold text-amber-600">
                  {recommendations.filter(r => r.status === 'PENDING').length}
                </p>
              </div>
              <div className="border-l pl-4">
                <p className="text-sm text-slate-500">Em Andamento</p>
                <p className="text-2xl font-bold text-blue-600">
                  {recommendations.filter(r => r.status === 'IN_PROGRESS').length}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.map((rec) => {
          const status = statusConfig[rec.status] || statusConfig.PENDING;
          
          return (
            <Card key={rec.id} className="overflow-hidden">
              <div className="flex">
                {/* Priority Indicator */}
                <div className={`
                  w-16 flex-shrink-0 flex items-center justify-center
                  ${rec.priority === 1 ? 'bg-red-500' : 
                    rec.priority === 2 ? 'bg-orange-500' : 
                    rec.priority === 3 ? 'bg-amber-500' : 'bg-slate-400'}
                `}>
                  <span className="text-white font-bold text-xl">
                    #{rec.priority || '-'}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[rec.recommendationType] || rec.recommendationType}
                          </Badge>
                          <Badge className={`text-xs ${status.color}`}>
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                          </Badge>
                        </div>
                        <CardTitle className="text-base">{rec.title}</CardTitle>
                      </div>
                      {rec.confidenceLevel && (
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Confiança</p>
                          <p className="font-bold">{(rec.confidenceLevel * 100).toFixed(0)}%</p>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-slate-600 mb-3">{rec.description}</p>
                    
                    {rec.rationale && (
                      <div className="bg-slate-50 p-3 rounded-lg mb-3">
                        <p className="text-xs text-slate-500 font-medium mb-1">Justificativa:</p>
                        <p className="text-sm text-slate-700">{rec.rationale}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-xs text-slate-500">
                        {rec.targetIndicator && (
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {rec.targetIndicator}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(rec.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {rec.expectedImpact && (
                        <span className="text-xs text-green-600">
                          Impacto: {rec.expectedImpact}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
