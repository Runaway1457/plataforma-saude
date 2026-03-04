// ============================================================
// MAIN APPLICATION PAGE - Clinical & Population Health Platform
// ============================================================

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Stethoscope, 
  Activity, 
  Users, 
  MapPin, 
  AlertTriangle,
  Heart,
  Building2,
  TrendingUp,
  Shield,
  Brain
} from 'lucide-react';
import { ClinicalModule } from '@/components/clinical/ClinicalModule';
import { PopulationHealthModule } from '@/components/pophealth/PopulationHealthModule';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('clinical');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Plataforma de Inteligência Clínica
                </h1>
                <p className="text-sm text-slate-500">
                  Saúde Populacional & Atenção Primária
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Shield className="w-3 h-3 mr-1" />
                LGPD Compliant
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Brain className="w-3 h-3 mr-1" />
                AI Assistido
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-2 mx-auto">
            <TabsTrigger value="clinical" className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Módulo Clínico
            </TabsTrigger>
            <TabsTrigger value="pophealth" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Saúde Populacional
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clinical" className="space-y-6">
            <ClinicalModule />
          </TabsContent>

          <TabsContent value="pophealth" className="space-y-6">
            <PopulationHealthModule />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500">
              © 2024 Plataforma de Inteligência Clínica - Demo Portfolio
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Sistema de apoio à decisão - Não substitui avaliação médica
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
