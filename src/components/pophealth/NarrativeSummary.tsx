// ============================================================
// NARRATIVE SUMMARY COMPONENT
// ============================================================

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Brain,
  Loader2,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Info
} from 'lucide-react';

interface NarrativeSummaryProps {
  analysis: {
    epidemiological?: {
      interpretation: string;
      keyFindings: string[];
      trends: Array<{
        indicator: string;
        direction: string;
        magnitude: number;
        significance: string;
      }>;
      anomalies: Array<{
        indicator: string;
        description: string;
        severity: string;
      }>;
      riskAssessment: string;
      confidence: number;
      dataLimitations: string[];
    };
    recommendations?: {
      recommendations: Array<{
        title: string;
        description: string;
        priority: number;
      }>;
      rationale: string;
      expectedImpact: string;
    };
    narrative?: {
      executiveSummary: string;
      keyMetrics: Array<{
        name: string;
        value: string;
        trend: string;
        interpretation: string;
      }>;
      highlights: string[];
      concerns: string[];
      recommendedActions: string[];
      narrative: string;
    };
  } | null;
  isLoading: boolean;
  regionId: string | null;
}

export function NarrativeSummary({ analysis, isLoading, regionId }: NarrativeSummaryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            <p className="text-slate-500">Gerando análise com IA...</p>
            <p className="text-xs text-slate-400">
              Isso pode levar alguns segundos
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-slate-500">
            <Brain className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="font-medium">Análise de IA não gerada</p>
            <p className="text-sm mt-2">
              Selecione uma regional específica e clique em "Gerar Análise IA" para obter insights personalizados.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { epidemiological, recommendations, narrative } = analysis;

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      {narrative && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-slate-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              Resumo Executivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-slate-800 leading-relaxed">
              {narrative.executiveSummary}
            </p>
            
            {/* Key Metrics */}
            {narrative.keyMetrics && narrative.keyMetrics.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {narrative.keyMetrics.slice(0, 4).map((metric, i) => (
                  <div key={i} className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-slate-500 mb-1">{metric.name}</p>
                    <p className="text-xl font-bold">{metric.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{metric.trend}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Epidemiological Analysis */}
      {epidemiological && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5" />
              Análise Epidemiológica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">Interpretação:</p>
              <p className="text-slate-800">{epidemiological.interpretation}</p>
            </div>

            {/* Key Findings */}
            {epidemiological.keyFindings && epidemiological.keyFindings.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Achados Principais:</p>
                <ul className="list-disc list-inside space-y-1">
                  {epidemiological.keyFindings.map((finding, i) => (
                    <li key={i} className="text-sm text-slate-600">{finding}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Trends */}
            {epidemiological.trends && epidemiological.trends.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Tendências Identificadas:</p>
                <div className="flex flex-wrap gap-2">
                  {epidemiological.trends.map((trend, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {trend.indicator}: {trend.direction} ({trend.significance})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Anomalies */}
            {epidemiological.anomalies && epidemiological.anomalies.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Anomalias Detectadas</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {epidemiological.anomalies.map((anomaly, i) => (
                      <li key={i}>{anomaly.indicator}: {anomaly.description}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Risk Assessment */}
            {epidemiological.riskAssessment && (
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <p className="text-sm font-medium text-amber-800 mb-1">Avaliação de Risco:</p>
                <p className="text-sm text-amber-700">{epidemiological.riskAssessment}</p>
              </div>
            )}

            {/* Confidence and Limitations */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">
                Confiança: <span className="font-medium">{(epidemiological.confidence * 100).toFixed(0)}%</span>
              </span>
              {epidemiological.dataLimitations && epidemiological.dataLimitations.length > 0 && (
                <div className="text-slate-400 text-xs">
                  Limitações: {epidemiological.dataLimitations.join(', ')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Highlights and Concerns */}
      {narrative && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Highlights */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                Destaques Positivos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {narrative.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {h}
                  </li>
                ))}
                {narrative.highlights.length === 0 && (
                  <li className="text-sm text-slate-400">Nenhum destaque identificado</li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Concerns */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-amber-700">
                <AlertTriangle className="w-5 h-5" />
                Preocupações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {narrative.concerns.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    {c}
                  </li>
                ))}
                {narrative.concerns.length === 0 && (
                  <li className="text-sm text-slate-400">Nenhuma preocupação identificada</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommended Actions */}
      {narrative?.recommendedActions && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="w-5 h-5" />
              Ações Recomendadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {narrative.recommendedActions.map((action, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-700">{action}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Sobre esta análise</AlertTitle>
        <AlertDescription className="text-xs">
          Esta análise foi gerada por inteligência artificial como ferramenta de apoio à decisão. 
          As recomendações devem ser validadas por profissionais de saúde pública antes de implementação.
          Dados de entrada: DATASUS e fontes públicas de saúde.
        </AlertDescription>
      </Alert>
    </div>
  );
}
