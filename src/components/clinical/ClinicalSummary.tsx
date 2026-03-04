// ============================================================
// CLINICAL SUMMARY COMPONENT
// ============================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Pill,
  Activity,
  Stethoscope,
  ClipboardList
} from 'lucide-react';
import { TriageBadge } from './TriageBadge';

interface ClinicalSummaryData {
  id: string;
  chiefComplaint: string;
  historyPresentIllness: string;
  relevantHistory: string | null;
  currentMedications: string;
  allergiesSummary: string | null;
  riskFactorsSummary: string | null;
  dataGaps: string;
  pendingExams: string;
  alertFlags: string;
  triagePriority: string;
  summaryForPhysician: string | null;
  hypotheses: Array<{
    hypothesisName: string;
    icdCode: string | null;
    probability: number | null;
    confidenceLevel: string | null;
    supportingEvidence: string;
    contradictingEvidence: string;
    missingData: string;
    suggestedWorkup: string;
    rankOrder: number | null;
  }>;
}

interface ClinicalSummaryProps {
  sessionId: string;
}

export function ClinicalSummary({ sessionId }: ClinicalSummaryProps) {
  const { data, isLoading, error } = useQuery<ClinicalSummaryData>({
    queryKey: ['clinical-summary', sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/clinical/session?sessionId=${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      const json = await res.json();
      return json.session?.clinicalSummary;
    },
    enabled: !!sessionId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-slate-500">
            Complete a pré-consulta para gerar o resumo clínico.
          </p>
        </CardContent>
      </Card>
    );
  }

  const medications = data.currentMedications ? JSON.parse(data.currentMedications) : [];
  const dataGaps = data.dataGaps ? JSON.parse(data.dataGaps) : [];
  const pendingExams = data.pendingExams ? JSON.parse(data.pendingExams) : [];
  const alertFlags = data.alertFlags ? JSON.parse(data.alertFlags) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Resumo Clínico
            </CardTitle>
            <TriageBadge priority={data.triagePriority} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chief Complaint */}
          <div>
            <h4 className="font-medium text-slate-700 mb-1">Queixa Principal</h4>
            <p className="text-slate-900">{data.chiefComplaint}</p>
          </div>

          {/* HDA */}
          <div>
            <h4 className="font-medium text-slate-700 mb-1">História da Doença Atual</h4>
            <p className="text-slate-900 whitespace-pre-wrap">{data.historyPresentIllness}</p>
          </div>

          {data.relevantHistory && (
            <div>
              <h4 className="font-medium text-slate-700 mb-1">Antecedentes Relevantes</h4>
              <p className="text-slate-900">{data.relevantHistory}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medications and Allergies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="w-4 h-4" />
            Medicamentos e Alergias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h5 className="text-sm font-medium text-slate-500 mb-2">Medicamentos em Uso</h5>
              <div className="flex flex-wrap gap-1">
                {medications.map((med: string, i: number) => (
                  <Badge key={i} variant="secondary">{med}</Badge>
                ))}
                {medications.length === 0 && <span className="text-sm text-slate-400">Nenhum</span>}
              </div>
            </div>
            <div>
              <h5 className="text-sm font-medium text-slate-500 mb-2">Alergias</h5>
              <p className="text-sm">{data.allergiesSummary || 'Nenhuma conhecida'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Flags */}
      {alertFlags.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Alertas Clínicos</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2">
              {alertFlags.map((flag: string, i: number) => (
                <li key={i}>{flag}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Data Gaps */}
      {dataGaps.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <XCircle className="w-4 h-4" />
              Lacunas de Informação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-amber-800">
              {dataGaps.map((gap: string, i: number) => (
                <li key={i}>{gap}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Differential Hypotheses */}
      {data.hypotheses && data.hypotheses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Hipóteses Diagnósticas Diferenciais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.hypotheses.map((hypothesis, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="font-medium">{hypothesis.hypothesisName}</h5>
                      {hypothesis.icdCode && (
                        <Badge variant="outline" className="text-xs mt-1">
                          CID-10: {hypothesis.icdCode}
                        </Badge>
                      )}
                    </div>
                    {hypothesis.probability && (
                      <div className="text-right">
                        <div className="text-sm text-slate-500">Probabilidade</div>
                        <div className="text-lg font-bold">{(hypothesis.probability * 100).toFixed(0)}%</div>
                      </div>
                    )}
                  </div>

                  {hypothesis.probability && (
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${hypothesis.probability * 100}%` }}
                      />
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-green-600 font-medium">Evidências a favor:</span>
                      <ul className="list-disc list-inside text-slate-600">
                        {JSON.parse(hypothesis.supportingEvidence || '[]').map((e: string, i: number) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-red-600 font-medium">Evidências contra:</span>
                      <ul className="list-disc list-inside text-slate-600">
                        {JSON.parse(hypothesis.contradictingEvidence || '[]').map((e: string, i: number) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {JSON.parse(hypothesis.suggestedWorkup || '[]').length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <span className="text-sm font-medium text-slate-500">Investigações sugeridas:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {JSON.parse(hypothesis.suggestedWorkup || '[]').map((w: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{w}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500 mt-4 italic">
              * Estas são hipóteses diferenciais para apoio à decisão clínica, não diagnósticos definitivos.
              A avaliação médica é necessária para confirmação diagnóstica.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary for Physician */}
      {data.summaryForPhysician && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700">
              <ClipboardList className="w-4 h-4" />
              Resumo para o Médico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-900 whitespace-pre-wrap">{data.summaryForPhysician}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
