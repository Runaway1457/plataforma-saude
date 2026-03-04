// ============================================================
// DifferentialHypotheses Component - List of differential diagnoses
// ============================================================

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Stethoscope,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Activity
} from 'lucide-react';
import { useAppStore, DifferentialHypothesis } from '@/lib/stores/app-store';
import { cn } from '@/lib/utils';

export function DifferentialHypotheses() {
  const { currentPatient, differentialHypotheses } = useAppStore();

  // Demo hypotheses if none from AI
  const hypotheses: DifferentialHypothesis[] = differentialHypotheses.length > 0 
    ? differentialHypotheses 
    : [
        {
          hypothesisName: 'Angina Estável',
          icdCode: 'I20.9',
          probability: 0.65,
          confidenceLevel: 'high',
          supportingEvidence: [
            'Dor torácica relacionada a esforço',
            'Fatores de risco cardiovascular presentes',
            'Idade e histórico compatíveis'
          ],
          contradictingEvidence: [
            'Sem irradiação clássica para braço'
          ],
          missingData: [
            'Eletrocardiograma',
            'Dosagem de troponina',
            'Teste ergométrico'
          ],
          suggestedWorkup: [
            'ECG de repouso',
            'Biomarcadores cardíacos',
            'Ecocardiograma',
            'Avaliação cardiológica'
          ]
        },
        {
          hypothesisName: 'Insuficiência Cardíaca',
          icdCode: 'I50.9',
          probability: 0.35,
          confidenceLevel: 'medium',
          supportingEvidence: [
            'Dispneia aos esforços',
            'Múltiplos fatores de risco',
            'Histórico de HAS e DM'
          ],
          contradictingEvidence: [
            'Sem edema de membros inferiores relatado',
            'Sem ortopneia'
          ],
          missingData: [
            'Dosagem de BNP',
            'Raio-X de tórax',
            'Ecocardiograma'
          ],
          suggestedWorkup: [
            'BNP ou NT-proBNP',
            'Raio-X de tórax',
            'Ecocardiograma'
          ]
        },
        {
          hypothesisName: 'Refluxo Gastroesofágico',
          icdCode: 'K21',
          probability: 0.25,
          confidenceLevel: 'low',
          supportingEvidence: [
            'Dor torácica não cardíaca'
          ],
          contradictingEvidence: [
            'Sem relação com alimentação relatada',
            'Sem pirose típica'
          ],
          missingData: [
            'Avaliação gastroenterológica'
          ],
          suggestedWorkup: [
            'Teste terapêutico com IBP',
            'Endoscopia digestiva alta se persistir'
          ]
        }
      ];

  if (!currentPatient) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-slate-500">
            <Stethoscope className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Inicie uma pré-consulta para ver hipóteses</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.6) return 'bg-green-500';
    if (prob >= 0.4) return 'bg-amber-500';
    if (prob >= 0.2) return 'bg-orange-500';
    return 'bg-slate-400';
  };

  const getConfidenceBadge = (level: string) => {
    const config: Record<string, { label: string; className: string }> = {
      high: { label: 'Alta confiança', className: 'bg-green-100 text-green-700' },
      medium: { label: 'Média confiança', className: 'bg-amber-100 text-amber-700' },
      low: { label: 'Baixa confiança', className: 'bg-slate-100 text-slate-600' },
    };
    const c = config[level] || config.low;
    return (
      <Badge variant="secondary" className={cn('text-xs', c.className)}>
        {c.label}
      </Badge>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-purple-500" />
          Hipóteses Diagnósticas
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          Gerado por IA - Não substitui avaliação médica
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="divide-y">
            {hypotheses.map((hypothesis, index) => (
              <div key={index} className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="font-medium text-slate-800">{hypothesis.hypothesisName}</h4>
                      {hypothesis.icdCode && (
                        <Badge variant="outline" className="text-xs mt-1">
                          CID: {hypothesis.icdCode}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {getConfidenceBadge(hypothesis.confidenceLevel)}
                </div>

                {/* Probability Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-500">Probabilidade</span>
                    <span className="font-medium text-slate-700">{(hypothesis.probability * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full transition-all', getProbabilityColor(hypothesis.probability))}
                      style={{ width: `${hypothesis.probability * 100}%` }}
                    />
                  </div>
                </div>

                {/* Supporting Evidence */}
                {hypothesis.supportingEvidence.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Evidências Favoráveis
                    </h5>
                    <ul className="space-y-0.5">
                      {hypothesis.supportingEvidence.map((evidence, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">•</span>
                          {evidence}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Contradicting Evidence */}
                {hypothesis.contradictingEvidence.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Evidências Contraditórias
                    </h5>
                    <ul className="space-y-0.5">
                      {hypothesis.contradictingEvidence.map((evidence, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                          <span className="text-red-500 mt-0.5">•</span>
                          {evidence}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Data */}
                {hypothesis.missingData.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" />
                      Dados Faltantes
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {hypothesis.missingData.map((data, i) => (
                        <Badge key={i} variant="outline" className="text-xs text-amber-600 border-amber-200">
                          {data}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Workup */}
                {hypothesis.suggestedWorkup.length > 0 && (
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <h5 className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      Investigação Sugerida
                    </h5>
                    <ul className="space-y-0.5">
                      {hypothesis.suggestedWorkup.map((workup, i) => (
                        <li key={i} className="text-xs text-blue-700 flex items-start gap-1">
                          <Activity className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {workup}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
