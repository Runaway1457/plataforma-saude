// ============================================================
// PATIENT TIMELINE COMPONENT
// ============================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Pill, 
  AlertTriangle, 
  Activity, 
  Stethoscope,
  Loader2,
  Calendar
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  eventDate: string;
  significance: string | null;
}

interface PatientDetails {
  conditions: Array<{ conditionName: string; conditionCode: string | null; status: string; onsetDate: string | null }>;
  medications: Array<{ medicationName: string; dosage: string | null; frequency: string | null; startDate: string | null }>;
  allergies: Array<{ substance: string; reaction: string | null; severity: string | null }>;
  vitalSigns: Array<{ vitalType: string; value: number; unit: string; effectiveDate: string }>;
  timelineEvents: TimelineEvent[];
}

interface PatientTimelineProps {
  patientId: string;
  detailed?: boolean;
}

const eventTypeIcons: Record<string, React.ReactNode> = {
  'DIAGNOSIS': <Stethoscope className="w-4 h-4" />,
  'MEDICATION_START': <Pill className="w-4 h-4" />,
  'ALLERGY_DISCOVERED': <AlertTriangle className="w-4 h-4" />,
  'CONSULTATION': <Activity className="w-4 h-4" />,
  'SYMPTOM_ONSET': <Clock className="w-4 h-4" />,
  'default': <Calendar className="w-4 h-4" />,
};

const eventColors: Record<string, string> = {
  'DIAGNOSIS': 'bg-blue-500',
  'MEDICATION_START': 'bg-green-500',
  'ALLERGY_DISCOVERED': 'bg-red-500',
  'CONSULTATION': 'bg-purple-500',
  'SYMPTOM_ONSET': 'bg-amber-500',
  'default': 'bg-slate-500',
};

export function PatientTimeline({ patientId, detailed = false }: PatientTimelineProps) {
  const { data, isLoading } = useQuery<PatientDetails>({
    queryKey: ['patient-details', patientId],
    queryFn: async () => {
      const res = await fetch(`/api/clinical/patients?id=${patientId}`);
      if (!res.ok) throw new Error('Failed to fetch patient details');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  // Build timeline from all sources
  const allEvents: Array<{ date: Date; type: string; title: string; description: string; color: string }> = [];

  // Add conditions
  data.conditions.forEach(c => {
    if (c.onsetDate) {
      allEvents.push({
        date: new Date(c.onsetDate),
        type: 'DIAGNOSIS',
        title: c.conditionName,
        description: `Diagnóstico: ${c.status === 'ACTIVE' ? 'Ativo' : c.status}`,
        color: eventColors['DIAGNOSIS'],
      });
    }
  });

  // Add medications
  data.medications.forEach(m => {
    if (m.startDate) {
      allEvents.push({
        date: new Date(m.startDate),
        type: 'MEDICATION_START',
        title: m.medicationName,
        description: `${m.dosage || ''} ${m.frequency || ''}`.trim(),
        color: eventColors['MEDICATION_START'],
      });
    }
  });

  // Add timeline events
  data.timelineEvents.forEach(e => {
    allEvents.push({
      date: new Date(e.eventDate),
      type: e.eventType,
      title: e.title,
      description: e.description || '',
      color: eventColors[e.eventType] || eventColors['default'],
    });
  });

  // Sort by date descending
  allEvents.sort((a, b) => b.date.getTime() - a.date.getTime());

  const Container = detailed ? ScrollArea : 'div';
  const containerProps = detailed ? { className: 'h-[500px]' } : { className: 'space-y-3' };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Linha do Tempo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div {...containerProps}>
          <div className="relative">
            {allEvents.slice(0, detailed ? undefined : 5).map((event, index) => (
              <div key={index} className="flex gap-3 pb-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full ${event.color} flex items-center justify-center text-white`}>
                    {eventTypeIcons[event.type] || eventTypeIcons['default']}
                  </div>
                  {index < allEvents.length - 1 && (
                    <div className="w-0.5 flex-1 bg-slate-200 mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-slate-500">{event.description}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {event.date.toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {allEvents.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-4">
              Nenhum evento registrado
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
