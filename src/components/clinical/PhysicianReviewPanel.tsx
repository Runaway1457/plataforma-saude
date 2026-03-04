'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Star, AlertTriangle, Stethoscope } from 'lucide-react';

interface Hypothesis {
  hypothesisName: string;
  icdCode?: string;
  probability?: number;
  confidenceLevel?: string;
}

interface TriageAssessment {
  priority: string;
  urgencyScore?: number;
  clinicalReasoning?: string;
  redFlagCount?: number;
}

interface PhysicianReviewPanelProps {
  sessionId: string;
  patientName: string;
  triage?: TriageAssessment;
  hypotheses?: Hypothesis[];
  existingReview?: {
    triageAccepted?: boolean;
    triageCorrectedTo?: string;
    addedDiagnosis?: string;
    dataQualityRating?: number;
    aiUsefulnessRating?: number;
    comments?: string;
  };
  onReviewSubmitted?: () => void;
}

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  IMMEDIATE: { label: 'Imediato', color: 'bg-red-100 text-red-800' },
  URGENT:    { label: 'Urgente',  color: 'bg-orange-100 text-orange-800' },
  HIGH:      { label: 'Alta',     color: 'bg-yellow-100 text-yellow-800' },
  MODERATE:  { label: 'Moderada', color: 'bg-blue-100 text-blue-800' },
  ROUTINE:   { label: 'Rotina',   color: 'bg-green-100 text-green-800' },
  LOW:       { label: 'Baixa',    color: 'bg-gray-100 text-gray-800' },
};

function StarRating({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          className="focus:outline-none disabled:cursor-default hover:scale-110 transition-transform"
        >
          <Star
            size={20}
            className={star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        </button>
      ))}
    </div>
  );
}

export function PhysicianReviewPanel({
  sessionId,
  patientName,
  triage,
  hypotheses = [],
  existingReview,
  onReviewSubmitted,
}: PhysicianReviewPanelProps) {
  const isReadOnly = !!existingReview;

  const [triageAccepted, setTriageAccepted] = useState<boolean | undefined>(
    existingReview?.triageAccepted
  );
  const [correctedPriority, setCorrectedPriority] = useState(
    existingReview?.triageCorrectedTo || ''
  );
  const [triageComment, setTriageComment] = useState('');
  const [acceptedHypotheses, setAcceptedHypotheses] = useState<string[]>([]);
  const [rejectedHypotheses, setRejectedHypotheses] = useState<string[]>([]);
  const [addedDiagnosis, setAddedDiagnosis] = useState(existingReview?.addedDiagnosis || '');
  const [dataQualityRating, setDataQualityRating] = useState(existingReview?.dataQualityRating || 0);
  const [aiUsefulnessRating, setAiUsefulnessRating] = useState(existingReview?.aiUsefulnessRating || 0);
  const [comments, setComments] = useState(existingReview?.comments || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(isReadOnly);

  const toggleHypothesis = (name: string, accepted: boolean) => {
    if (accepted) {
      setAcceptedHypotheses(prev =>
        prev.includes(name) ? prev.filter(h => h !== name) : [...prev, name]
      );
      setRejectedHypotheses(prev => prev.filter(h => h !== name));
    } else {
      setRejectedHypotheses(prev =>
        prev.includes(name) ? prev.filter(h => h !== name) : [...prev, name]
      );
      setAcceptedHypotheses(prev => prev.filter(h => h !== name));
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/clinical/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          triageAccepted,
          triageCorrectedTo: triageAccepted === false ? correctedPriority : undefined,
          triageComment,
          acceptedHypotheses: acceptedHypotheses.length > 0 ? acceptedHypotheses : undefined,
          rejectedHypotheses: rejectedHypotheses.length > 0 ? rejectedHypotheses : undefined,
          addedDiagnosis: addedDiagnosis || undefined,
          dataQualityRating: dataQualityRating || undefined,
          aiUsefulnessRating: aiUsefulnessRating || undefined,
          comments: comments || undefined,
        }),
      });
      if (response.ok) {
        setSubmitted(true);
        onReviewSubmitted?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const priorityInfo = triage ? PRIORITY_LABELS[triage.priority] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Revisão Médica</h2>
        <span className="text-sm text-muted-foreground">— {patientName}</span>
      </div>

      {submitted && !isReadOnly && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          <CheckCircle size={16} />
          Revisão registrada com sucesso.
        </div>
      )}

      {/* Triagem da IA */}
      {triage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              Triagem da IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Prioridade:</span>
              {priorityInfo && (
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${priorityInfo.color}`}>
                  {priorityInfo.label}
                </span>
              )}
              {triage.urgencyScore !== undefined && (
                <span className="text-xs text-muted-foreground">Score: {triage.urgencyScore}/100</span>
              )}
              {triage.redFlagCount !== undefined && triage.redFlagCount > 0 && (
                <span className="text-xs text-red-600 font-medium">{triage.redFlagCount} red flag(s)</span>
              )}
            </div>
            {triage.clinicalReasoning && (
              <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">{triage.clinicalReasoning}</p>
            )}

            {!isReadOnly && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm font-medium">Sua avaliação da triagem:</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={triageAccepted === true ? 'default' : 'outline'}
                    className="gap-1"
                    onClick={() => setTriageAccepted(true)}
                  >
                    <CheckCircle size={14} /> Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant={triageAccepted === false ? 'destructive' : 'outline'}
                    className="gap-1"
                    onClick={() => setTriageAccepted(false)}
                  >
                    <XCircle size={14} /> Corrigir
                  </Button>
                </div>
                {triageAccepted === false && (
                  <Select value={correctedPriority} onValueChange={setCorrectedPriority}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Selecione a prioridade correta" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Textarea
                  placeholder="Comentário sobre a triagem (opcional)"
                  value={triageComment}
                  onChange={e => setTriageComment(e.target.value)}
                  className="text-sm"
                  rows={2}
                />
              </div>
            )}

            {isReadOnly && existingReview && (
              <div className="pt-2 border-t text-sm">
                <span className={`font-medium ${existingReview.triageAccepted ? 'text-green-700' : 'text-orange-700'}`}>
                  {existingReview.triageAccepted ? '✓ Triagem confirmada' : `⚠ Corrigida para: ${existingReview.triageCorrectedTo}`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hipóteses Diagnósticas */}
      {hypotheses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Hipóteses Diagnósticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hypotheses.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{h.hypothesisName}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.icdCode && `CID: ${h.icdCode} · `}
                    {h.probability !== undefined && `Prob.: ${Math.round(h.probability * 100)}% · `}
                    {h.confidenceLevel && `Confiança: ${h.confidenceLevel}`}
                  </p>
                </div>
                {!isReadOnly && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={acceptedHypotheses.includes(h.hypothesisName) ? 'default' : 'outline'}
                      className="h-7 px-2"
                      onClick={() => toggleHypothesis(h.hypothesisName, true)}
                    >
                      <CheckCircle size={12} />
                    </Button>
                    <Button
                      size="sm"
                      variant={rejectedHypotheses.includes(h.hypothesisName) ? 'destructive' : 'outline'}
                      className="h-7 px-2"
                      onClick={() => toggleHypothesis(h.hypothesisName, false)}
                    >
                      <XCircle size={12} />
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {!isReadOnly && (
              <div className="pt-2">
                <Label className="text-sm">Diagnóstico Final (opcional)</Label>
                <Textarea
                  placeholder="Diagnóstico estabelecido pelo médico..."
                  value={addedDiagnosis}
                  onChange={e => setAddedDiagnosis(e.target.value)}
                  className="text-sm mt-1"
                  rows={2}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Avaliação da IA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Avaliação do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Qualidade dos Dados Coletados</Label>
              <div className="mt-1">
                <StarRating
                  value={dataQualityRating}
                  onChange={setDataQualityRating}
                  disabled={isReadOnly}
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">Utilidade da IA</Label>
              <div className="mt-1">
                <StarRating
                  value={aiUsefulnessRating}
                  onChange={setAiUsefulnessRating}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-sm">Comentários Adicionais</Label>
            <Textarea
              placeholder="Observações sobre a consulta..."
              value={comments}
              onChange={e => setComments(e.target.value)}
              className="text-sm mt-1"
              rows={3}
              disabled={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botão de Submit */}
      {!isReadOnly && !submitted && (
        <Button
          onClick={handleSubmit}
          disabled={submitting || triageAccepted === undefined}
          className="w-full"
        >
          {submitting ? 'Registrando...' : 'Registrar Revisão'}
        </Button>
      )}
    </div>
  );
}
