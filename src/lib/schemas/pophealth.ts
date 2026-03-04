// ============================================================
// POPULATION HEALTH SCHEMAS - Zod Validation Schemas
// ============================================================

import { z } from 'zod';

// ------------------------------------------------------------
// TERRITORIAL SCHEMAS
// ------------------------------------------------------------

export const HealthRegionSchema = z.object({
  id: z.string().optional(),
  code: z.string(),
  name: z.string().min(1),
  state: z.string().length(2),
  macroRegion: z.string().optional(),
  population: z.number().int().positive().optional(),
  areaKm2: z.number().positive().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type HealthRegionInput = z.infer<typeof HealthRegionSchema>;

export const MunicipalitySchema = z.object({
  id: z.string().optional(),
  code: z.string().length(7), // IBGE code
  name: z.string().min(1),
  state: z.string().length(2),
  regionId: z.string(),
  population: z.number().int().positive().optional(),
  urbanPopulation: z.number().int().optional(),
  ruralPopulation: z.number().int().optional(),
  areaKm2: z.number().positive().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type MunicipalityInput = z.infer<typeof MunicipalitySchema>;

export const FacilitySchema = z.object({
  id: z.string().optional(),
  cnes: z.string().optional(),
  name: z.string().min(1),
  facilityType: z.enum(['UBS', 'UPA', 'HOSPITAL', 'CAPS', 'CEO', 'OUTRO']),
  regionId: z.string(),
  municipalityId: z.string(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  beds: z.number().int().optional(),
  icuBeds: z.number().int().optional(),
});

export type FacilityInput = z.infer<typeof FacilitySchema>;

// ------------------------------------------------------------
// INDICATOR SCHEMAS
// ------------------------------------------------------------

export const IndicatorCategorySchema = z.enum([
  'morbidity',
  'mortality',
  'coverage',
  'access',
  'capacity',
  'demographic',
  'socioeconomic',
  'environmental',
]);

export const PopulationIndicatorSchema = z.object({
  id: z.string().optional(),
  regionId: z.string().optional(),
  municipalityId: z.string().optional(),
  indicatorCode: z.string(),
  indicatorName: z.string(),
  category: IndicatorCategorySchema,
  value: z.number(),
  unit: z.string().optional(),
  period: z.string(), // YYYY or YYYY-MM
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  dataSource: z.string().optional(),
  dataQuality: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export type PopulationIndicatorInput = z.infer<typeof PopulationIndicatorSchema>;

// ------------------------------------------------------------
// RISK PROFILE SCHEMAS
// ------------------------------------------------------------

export const RiskLevelSchema = z.enum(['VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'CRITICAL']);

export const RiskProfileSchema = z.object({
  id: z.string().optional(),
  regionId: z.string().optional(),
  municipalityId: z.string().optional(),
  profileDate: z.coerce.date(),
  riskScore: z.number().min(0).max(100),
  riskLevel: RiskLevelSchema,
  category: z.string(),
  contributingFactors: z.array(z.string()).default([]),
  trendDirection: z.enum(['increasing', 'decreasing', 'stable']).optional(),
  trendMagnitude: z.number().optional(),
  predictionHorizon: z.number().int().positive().optional(), // months
  predictionValue: z.number().optional(),
  confidenceInterval: z.string().optional(),
  modelVersion: z.string().optional(),
  modelConfidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export type RiskProfileInput = z.infer<typeof RiskProfileSchema>;

// ------------------------------------------------------------
// RECOMMENDATION SCHEMAS
// ------------------------------------------------------------

export const RecommendationStatusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED', 'ESCALATED']);

export const RecommendationSchema = z.object({
  id: z.string().optional(),
  regionId: z.string(),
  recommendationType: z.string(),
  title: z.string(),
  description: z.string(),
  rationale: z.string().optional(),
  targetIndicator: z.string().optional(),
  expectedImpact: z.string().optional(),
  confidenceLevel: z.number().min(0).max(1).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  status: RecommendationStatusSchema.default('PENDING'),
  assignedTo: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  dataSource: z.array(z.string()).optional(),
  modelVersion: z.string().optional(),
});

export type RecommendationInput = z.infer<typeof RecommendationSchema>;

// ------------------------------------------------------------
// ANOMALY DETECTION SCHEMAS
// ------------------------------------------------------------

export const AnomalyTypeSchema = z.enum(['spike', 'drop', 'trend_change', 'outlier', 'seasonal_anomaly']);

export const AnomalyDetectionSchema = z.object({
  id: z.string().optional(),
  regionId: z.string().optional(),
  municipalityId: z.string().optional(),
  indicatorCode: z.string(),
  detectionDate: z.coerce.date(),
  anomalyType: AnomalyTypeSchema,
  expectedValue: z.number(),
  actualValue: z.number(),
  deviationScore: z.number(),
  significance: z.number().min(0).max(1),
  context: z.record(z.unknown()).optional(),
  modelVersion: z.string().optional(),
  acknowledged: z.boolean().default(false),
  notes: z.string().optional(),
});

export type AnomalyDetectionInput = z.infer<typeof AnomalyDetectionSchema>;

// ------------------------------------------------------------
// DATA QUALITY SCHEMAS
// ------------------------------------------------------------

export const DataQualityReportSchema = z.object({
  dataSource: z.string(),
  metricName: z.string(),
  metricValue: z.number(),
  threshold: z.number().optional(),
  passed: z.boolean().optional(),
  details: z.record(z.unknown()).optional(),
});

export type DataQualityReportInput = z.infer<typeof DataQualityReportSchema>;

export const IngestionJobSchema = z.object({
  id: z.string().optional(),
  source: z.string(),
  sourceUrl: z.string().optional(),
  filename: z.string().optional(),
  status: z.enum(['PENDING', 'RUNNING', 'VALIDATING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  recordsTotal: z.number().int().optional(),
  recordsValid: z.number().int().optional(),
  recordsInvalid: z.number().int().optional(),
  errors: z.array(z.record(z.unknown())).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  qualityReport: z.record(z.unknown()).optional(),
});

export type IngestionJobInput = z.infer<typeof IngestionJobSchema>;

// ------------------------------------------------------------
// DASHBOARD & AGGREGATION SCHEMAS
// ------------------------------------------------------------

export const TerritorySummarySchema = z.object({
  regionId: z.string(),
  regionName: z.string(),
  totalPopulation: z.number(),
  municipalitiesCount: z.number(),
  facilitiesCount: z.number(),
  averageRiskScore: z.number(),
  highRiskAreas: z.number(),
  activeAlerts: z.number(),
  indicatorsSummary: z.record(z.number()),
  trendData: z.array(z.object({
    period: z.string(),
    value: z.number(),
  })),
});

export type TerritorySummary = z.infer<typeof TerritorySummarySchema>;

export const DashboardMetricsSchema = z.object({
  totalPopulation: z.number(),
  totalEncounters: z.number(),
  hospitalizationRate: z.number(),
  mortalityRate: z.number(),
  coverageRate: z.number(),
  riskDistribution: z.record(z.number()),
  topConditions: z.array(z.object({
    condition: z.string(),
    count: z.number(),
    trend: z.number(),
  })),
  alertsCount: z.number(),
  recommendationsCount: z.number(),
});

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;

// ------------------------------------------------------------
// AGENT OUTPUT SCHEMAS
// ------------------------------------------------------------

export const AgentEpidemiologicalOutputSchema = z.object({
  interpretation: z.string(),
  keyFindings: z.array(z.string()),
  trends: z.array(z.object({
    indicator: z.string(),
    direction: z.string(),
    magnitude: z.number(),
    significance: z.string(),
  })),
  anomalies: z.array(z.object({
    indicator: z.string(),
    description: z.string(),
    severity: z.string(),
  })),
  riskAssessment: z.string(),
  confidence: z.number().min(0).max(1),
  dataLimitations: z.array(z.string()),
});

export type AgentEpidemiologicalOutput = z.infer<typeof AgentEpidemiologicalOutputSchema>;

export const AgentRecommendationOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema),
  priorityRanking: z.array(z.string()),
  rationale: z.string(),
  expectedImpact: z.string(),
  implementationNotes: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  dataUsed: z.array(z.string()),
  limitations: z.array(z.string()),
});

export type AgentRecommendationOutput = z.infer<typeof AgentRecommendationOutputSchema>;

export const AgentNarrativeOutputSchema = z.object({
  executiveSummary: z.string(),
  keyMetrics: z.array(z.object({
    name: z.string(),
    value: z.string(),
    trend: z.string(),
    interpretation: z.string(),
  })),
  highlights: z.array(z.string()),
  concerns: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  narrative: z.string(),
});

export type AgentNarrativeOutput = z.infer<typeof AgentNarrativeOutputSchema>;
