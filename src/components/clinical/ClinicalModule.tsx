// ============================================================
// CLINICAL MODULE - Main Component
// ============================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Send, 
  AlertTriangle, 
  Clock, 
  Pill, 
  Activity,
  FileText,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Stethoscope,
  ClipboardCheck
} from 'lucide-react';
import { PatientTimeline } from './PatientTimeline';
import { ClinicalSummary } from './ClinicalSummary';
import { TriageBadge } from './TriageBadge';
import { PhysicianReviewPanel } from './PhysicianReviewPanel';

interface Patient {
  id: string;
  name: string;
  birthDate: string;
  sex: string | null;
  conditions: Array<{ conditionName: string; status: string }>;
  medications: Array<{ medicationName: string; status: string }>;
  allergies: Array<{ substance: string }>;
  _count: { conditions: number; medications: number };
}

interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  confidence?: number | null;
  createdAt: string;
}

interface Session {
  id: string;
  status: string;
  primaryComplaint: string | null;
  patient: Patient;
  chatMessages: ChatMessage[];
  symptomReports: Array<{
    symptomName: string;
    severity: number | null;
    onsetDuration: string | null;
  }>;
  triageAssessment?: {
    priority: string;
    urgencyScore: number;
    redFlagCount: number;
    confidenceScore: number;
    clinicalReasoning?: string;
  } | null;
  physicianReview?: {
    triageAccepted?: boolean;
    triageCorrectedTo?: string;
    addedDiagnosis?: string;
    dataQualityRating?: number;
    aiUsefulnessRating?: number;
    comments?: string;
  } | null;
  clinicalSummary?: {
    hypotheses?: Array<{
      hypothesisName: string;
      icdCode?: string;
      probability?: number;
      confidenceLevel?: string;
    }>;
  } | null;
}

export function ClinicalModule() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch patients
  const { data: patientsData, isLoading: loadingPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const res = await fetch('/api/clinical/patients');
      if (!res.ok) throw new Error('Failed to fetch patients');
      return res.json();
    },
  });

  // Fetch/create session
  const { data: sessionData, isLoading: loadingSession, refetch: refetchSession } = useQuery<{session: Session}>({
    queryKey: ['session', selectedPatient?.id],
    queryFn: async () => {
      if (!selectedPatient) return { session: null as unknown as Session };
      const res = await fetch(`/api/clinical/session?patientId=${selectedPatient.id}`);
      if (!res.ok) throw new Error('Failed to fetch session');
      return res.json();
    },
    enabled: !!selectedPatient,
  });

  const session = sessionData?.session;

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (msg: string) => {
      const res = await fetch('/api/clinical/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session?.id, message: msg }),
      });
      if (!res.ok) throw new Error('Chat failed');
      return res.json();
    },
    onSuccess: () => {
      setMessage('');
      refetchSession();
    },
  });

  // Complete session mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/clinical/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session?.id }),
      });
      if (!res.ok) throw new Error('Failed to complete session');
      return res.json();
    },
    onSuccess: () => {
      refetchSession();
      setActiveTab('summary');
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && session?.chatMessages) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.chatMessages]);

  const handleSendMessage = () => {
    if (!message.trim() || !session) return;
    chatMutation.mutate(message);
  };

  const patients = patientsData?.patients || [];

  if (!selectedPatient) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Selecionar Paciente
            </CardTitle>
            <CardDescription>
              Escolha um paciente para iniciar a pré-consulta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPatients ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {patients.map((patient: Patient) => (
                  <Card 
                    key={patient.id} 
                    className="cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{patient.name}</h3>
                          <p className="text-sm text-slate-500">
                            {new Date(patient.birthDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Badge variant="outline" className="text-xs">
                          {patient._count.conditions} condições
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {patient._count.medications} medicamentos
                        </Badge>
                      </div>
                      {patient.allergies.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          {patient.allergies.length} alergia(s)
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Panel - Patient Info */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{selectedPatient.name}</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedPatient(null)}
              >
                Trocar
              </Button>
            </div>
            <CardDescription>
              {new Date(selectedPatient.birthDate).toLocaleDateString('pt-BR')} • {selectedPatient.sex === 'M' ? 'Masculino' : selectedPatient.sex === 'F' ? 'Feminino' : 'Não informado'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {session?.triageAssessment && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-500">Classificação de Risco</p>
                <TriageBadge priority={session.triageAssessment.priority} />
                <div className="flex gap-4 text-sm text-slate-500">
                  <span>Score: {session.triageAssessment.urgencyScore}</span>
                  <span>Red Flags: {session.triageAssessment.redFlagCount}</span>
                </div>
              </div>
            )}
            
            <Separator />
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">Condições Ativas</p>
              {selectedPatient.conditions.filter(c => c.status === 'ACTIVE').map((c, i) => (
                <Badge key={i} variant="secondary" className="mr-1 mb-1">
                  {c.conditionName}
                </Badge>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">Medicamentos</p>
              {selectedPatient.medications.filter(m => m.status === 'ACTIVE').slice(0, 3).map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Pill className="w-4 h-4 text-blue-500" />
                  {m.medicationName}
                </div>
              ))}
            </div>

            {selectedPatient.allergies.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-600">Alergias</p>
                {selectedPatient.allergies.map((a, i) => (
                  <Badge key={i} variant="destructive" className="mr-1">
                    {a.substance}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <PatientTimeline patientId={selectedPatient.id} />
      </div>

      {/* Right Panel - Chat and Summary */}
      <div className="lg:col-span-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat">
              <Stethoscope className="w-4 h-4 mr-2" />
              Pré-Consulta
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="w-4 h-4 mr-2" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="summary" disabled={session?.status !== 'COMPLETED'}>
              <FileText className="w-4 h-4 mr-2" />
              Resumo Médico
            </TabsTrigger>

            {/* Revisão Médica — badge amarelo piscando quando pendente */}
            <TabsTrigger
              value="review"
              disabled={session?.status !== 'COMPLETED'}
              className="relative"
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Revisão Médica
              {session?.status === 'COMPLETED' && !session?.physicianReview && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Assistente de Pré-Consulta</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    AI Assistido
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 px-4" ref={scrollRef}>
                  <div className="space-y-4 py-4">
                    {loadingSession ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : (
                      session?.chatMessages?.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              msg.role === 'USER'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-900'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            {msg.confidence && (
                              <p className="text-xs opacity-70 mt-1">
                                Confiança: {(msg.confidence * 100).toFixed(0)}%
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {chatMutation.isPending && (
                      <div className="flex justify-start">
                        <div className="bg-slate-100 rounded-lg px-4 py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite sua mensagem..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={chatMutation.isPending || session?.status === 'COMPLETED'}
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={chatMutation.isPending || session?.status === 'COMPLETED'}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  {session?.chatMessages && session.chatMessages.length > 6 && session.status !== 'COMPLETED' && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={() => completeMutation.mutate()}
                      disabled={completeMutation.isPending}
                    >
                      {completeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Finalizar Pré-Consulta
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Linha do Tempo de Saúde</CardTitle>
              </CardHeader>
              <CardContent>
                <PatientTimeline patientId={selectedPatient.id} detailed />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <ClinicalSummary sessionId={session?.id || ''} />
          </TabsContent>

          {/* Revisão Médica */}
          <TabsContent value="review" className="mt-4">
            {session && selectedPatient && (
              <PhysicianReviewPanel
                sessionId={session.id}
                patientName={selectedPatient.name}
                triage={session.triageAssessment ? {
                  priority: session.triageAssessment.priority,
                  urgencyScore: session.triageAssessment.urgencyScore,
                  clinicalReasoning: session.triageAssessment.clinicalReasoning,
                  redFlagCount: session.triageAssessment.redFlagCount,
                } : undefined}
                hypotheses={session.clinicalSummary?.hypotheses?.map((h: {
                  hypothesisName: string;
                  icdCode?: string;
                  probability?: number;
                  confidenceLevel?: string;
                }) => ({
                  hypothesisName: h.hypothesisName,
                  icdCode: h.icdCode,
                  probability: h.probability,
                  confidenceLevel: h.confidenceLevel,
                }))}
                existingReview={session.physicianReview ?? undefined}
                onReviewSubmitted={() => {
                  queryClient.invalidateQueries({ queryKey: ['session', selectedPatient.id] });
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
