// ============================================================
// PatientList Component - Display list of patients
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Activity, 
  Pill, 
  AlertCircle, 
  ChevronRight,
  RefreshCw 
} from 'lucide-react';
import { useAppStore, Patient } from '@/lib/stores/app-store';
import { LoadingSpinner } from '@/components/shared';
import { ErrorMessage } from '@/components/shared';

interface PatientListProps {
  onSelectPatient?: (patient: Patient) => void;
}

export function PatientList({ onSelectPatient }: PatientListProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { setCurrentPatient, setActiveModule } = useAppStore();

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/clinical/patients');
      if (!response.ok) throw new Error('Falha ao carregar pacientes');
      const data = await response.json();
      setPatients(data.patients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSelectPatient = (patient: Patient) => {
    setCurrentPatient(patient);
    onSelectPatient?.(patient);
  };

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Carregando pacientes..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardContent className="p-4">
          <ErrorMessage 
            title="Erro ao carregar pacientes" 
            message={error}
            onRetry={fetchPatients}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            Pacientes
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={fetchPatients}
            className="text-slate-500"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="divide-y">
            {patients.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum paciente encontrado</p>
              </div>
            ) : (
              patients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient)}
                  className="w-full p-4 hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                        {getInitials(patient.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800 truncate">
                          {patient.name}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {calculateAge(patient.birthDate)} anos
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {patient._count?.conditions || patient.conditions?.length || 0} condições
                        </span>
                        <span className="flex items-center gap-1">
                          <Pill className="w-3 h-3" />
                          {patient._count?.medications || patient.medications?.length || 0} medicamentos
                        </span>
                        {patient.allergies && patient.allergies.length > 0 && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertCircle className="w-3 h-3" />
                            {patient.allergies.length} alergias
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
