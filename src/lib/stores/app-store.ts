// ============================================================
// ZUSTAND STORE - Application State Management
// ============================================================

import { create } from 'zustand';

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export type ModuleType = 'clinical' | 'pophealth';

export interface Patient {
  id: string;
  name: string;
  birthDate: string;
  sex?: string;
  phone?: string;
  addressCity?: string;
  addressState?: string;
  bloodType?: string;
  conditions: PatientCondition[];
  medications: PatientMedication[];
  allergies: PatientAllergy[];
  vitalSigns?: PatientVitalSign[];
  timelineEvents?: TimelineEvent[];
  _count?: {
    conditions: number;
    medications: number;
  };
}

export interface PatientCondition {
  id: string;
  conditionName: string;
  conditionCode?: string;
  status: string;
  onsetDate?: string;
}

export interface PatientMedication {
  id: string;
  medicationName: string;
  dosage?: string;
  frequency?: string;
  status: string;
}

export interface PatientAllergy {
  id: string;
  substance: string;
  reaction?: string;
  severity?: string;
}

export interface PatientVitalSign {
  id: string;
  vitalType: string;
  value: number;
  unit: string;
  systolic?: number;
  diastolic?: number;
  effectiveDate: string;
}

export interface TimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description?: string;
  eventDate: string;
  category?: string;
}

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  confidence?: number;
  createdAt: string;
}

export interface Session {
  id: string;
  patientId: string;
  status: string;
  primaryComplaint?: string;
  startedAt: string;
}

export interface TriageData {
  priority: string;
  urgencyScore: number;
  redFlags: RedFlag[];
  riskFactors: string[];
  confidenceScore: number;
  dataCompleteness: number;
  recommendedAction?: string;
  clinicalReasoning?: string;
}

export interface RedFlag {
  id: string;
  type: string;
  description: string;
  severity: 'critical' | 'high' | 'moderate';
  recommendation?: string;
}

export interface ClinicalSummary {
  chiefComplaint: string;
  historyPresentIllness: string;
  relevantHistory?: string;
  currentMedications: string[];
  allergiesSummary?: string;
  riskFactorsSummary?: string;
  dataGaps: string[];
  alertFlags: string[];
  triagePriority: string;
  summaryForPhysician?: string;
}

export interface DifferentialHypothesis {
  hypothesisName: string;
  icdCode?: string;
  probability: number;
  confidenceLevel: string;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  missingData: string[];
  suggestedWorkup: string[];
}

export interface HealthRegion {
  id: string;
  code: string;
  name: string;
  state: string;
  population?: number;
  municipalities?: Municipality[];
  _count?: {
    municipalities: number;
    facilities: number;
  };
}

export interface Municipality {
  id: string;
  name: string;
  population?: number;
  riskProfiles?: RiskProfile[];
}

export interface RiskProfile {
  id: string;
  category: string;
  riskScore: number;
  riskLevel: string;
  trendDirection?: string;
  contributingFactors: string[];
}

export interface PopulationIndicator {
  indicatorCode: string;
  indicatorName: string;
  category: string;
  value: number;
  unit?: string;
  period: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  rationale?: string;
  expectedImpact?: string;
  confidenceLevel?: number;
  priority?: number;
  status: string;
}

export interface DashboardStatistics {
  totalPopulation: number;
  totalMunicipalities: number;
  totalFacilities: number;
  riskDistribution: Record<string, number>;
  topRiskAreas: RiskProfile[];
}

// ------------------------------------------------------------
// STORE STATE
// ------------------------------------------------------------

interface AppState {
  // Module navigation
  activeModule: ModuleType;
  setActiveModule: (module: ModuleType) => void;

  // Clinical module state
  currentPatient: Patient | null;
  setCurrentPatient: (patient: Patient | null) => void;
  
  currentSession: Session | null;
  setCurrentSession: (session: Session | null) => void;
  
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  
  triageData: TriageData | null;
  setTriageData: (data: TriageData | null) => void;
  
  clinicalSummary: ClinicalSummary | null;
  setClinicalSummary: (summary: ClinicalSummary | null) => void;
  
  differentialHypotheses: DifferentialHypothesis[];
  setDifferentialHypotheses: (hypotheses: DifferentialHypothesis[]) => void;

  // Population health state
  selectedRegion: HealthRegion | null;
  setSelectedRegion: (region: HealthRegion | null) => void;
  
  dashboardStatistics: DashboardStatistics | null;
  setDashboardStatistics: (stats: DashboardStatistics | null) => void;
  
  riskProfiles: RiskProfile[];
  setRiskProfiles: (profiles: RiskProfile[]) => void;
  
  recommendations: Recommendation[];
  setRecommendations: (recommendations: Recommendation[]) => void;

  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  error: string | null;
  setError: (error: string | null) => void;

  // Reset
  resetClinicalState: () => void;
}

// ------------------------------------------------------------
// STORE
// ------------------------------------------------------------

export const useAppStore = create<AppState>((set) => ({
  // Module navigation
  activeModule: 'clinical',
  setActiveModule: (module) => set({ activeModule: module }),

  // Clinical module state
  currentPatient: null,
  setCurrentPatient: (patient) => set({ currentPatient: patient }),
  
  currentSession: null,
  setCurrentSession: (session) => set({ currentSession: session }),
  
  chatMessages: [],
  addChatMessage: (message) => set((state) => ({ 
    chatMessages: [...state.chatMessages, message] 
  })),
  clearChatMessages: () => set({ chatMessages: [] }),
  
  triageData: null,
  setTriageData: (data) => set({ triageData: data }),
  
  clinicalSummary: null,
  setClinicalSummary: (summary) => set({ clinicalSummary: summary }),
  
  differentialHypotheses: [],
  setDifferentialHypotheses: (hypotheses) => set({ differentialHypotheses: hypotheses }),

  // Population health state
  selectedRegion: null,
  setSelectedRegion: (region) => set({ selectedRegion: region }),
  
  dashboardStatistics: null,
  setDashboardStatistics: (stats) => set({ dashboardStatistics: stats }),
  
  riskProfiles: [],
  setRiskProfiles: (profiles) => set({ riskProfiles: profiles }),
  
  recommendations: [],
  setRecommendations: (recommendations) => set({ recommendations: recommendations }),

  // UI state
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  error: null,
  setError: (error) => set({ error: error }),

  // Reset
  resetClinicalState: () => set({
    currentPatient: null,
    currentSession: null,
    chatMessages: [],
    triageData: null,
    clinicalSummary: null,
    differentialHypotheses: [],
  }),
}));
