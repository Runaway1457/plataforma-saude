// ============================================================
// POPULATION HEALTH API - Dashboard Data
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { orchestratePopulationHealthAnalysis } from '@/lib/agents/pophealth-agents';
import { withAuth } from '@/lib/auth-guard';
import { logger } from '@/lib/logger';

const DashboardAnalysisSchema = z.object({
  regionId: z.string().min(1, 'regionId é obrigatório'),
});

// GET /api/pophealth/dashboard - Get dashboard data
async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');

    const [regions, indicators, riskProfiles, recommendations] = await Promise.all([
      db.healthRegion.findMany({
        include: {
          municipalities: {
            include: {
              riskProfiles: { orderBy: { profileDate: 'desc' }, take: 1 },
            },
          },
          _count: { select: { municipalities: true, facilities: true } },
        },
      }),
      db.populationIndicator.findMany({
        where: regionId ? { regionId } : undefined,
        orderBy: { period: 'desc' },
        take: 100,
      }),
      db.riskProfile.findMany({
        where: regionId ? { regionId } : undefined,
        orderBy: { profileDate: 'desc' },
        take: 50,
      }),
      db.recommendation.findMany({
        where: regionId ? { regionId } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const totalPopulation = regions.reduce((sum, r) => sum + (r.population || 0), 0);
    const totalMunicipalities = regions.reduce((sum, r) => sum + r._count.municipalities, 0);
    const totalFacilities = regions.reduce((sum, r) => sum + r._count.facilities, 0);

    const riskDistribution: Record<string, number> = {
      VERY_LOW: 0,
      LOW: 0,
      MODERATE: 0,
      HIGH: 0,
      VERY_HIGH: 0,
      CRITICAL: 0,
    };

    for (const profile of riskProfiles) {
      riskDistribution[profile.riskLevel] = (riskDistribution[profile.riskLevel] || 0) + 1;
    }

    const indicatorsByCategory: Record<string, typeof indicators> = {};
    for (const indicator of indicators) {
      if (!indicatorsByCategory[indicator.category]) {
        indicatorsByCategory[indicator.category] = [];
      }
      indicatorsByCategory[indicator.category].push(indicator);
    }

    const topRiskAreas = riskProfiles
      .filter(rp => rp.municipalityId)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);

    logger.info('dashboard_data_fetched', { regionId, regionCount: regions.length });

    return NextResponse.json({
      regions,
      indicators: indicatorsByCategory,
      riskProfiles,
      recommendations,
      statistics: {
        totalPopulation,
        totalMunicipalities,
        totalFacilities,
        riskDistribution,
        topRiskAreas,
      },
    });
  } catch (error) {
    logger.error('dashboard_api_error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/pophealth/dashboard - Generate AI analysis
async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    
    const parsed = DashboardAnalysisSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    
    const { regionId } = parsed.data;

    const region = await db.healthRegion.findUnique({
      where: { id: regionId },
      include: {
        municipalities: {
          include: {
            riskProfiles: { orderBy: { profileDate: 'desc' }, take: 1 },
          },
        },
      },
    });

    if (!region) {
      return NextResponse.json({ error: 'Region not found' }, { status: 404 });
    }

    const [indicators, riskProfiles] = await Promise.all([
      db.populationIndicator.findMany({
        where: { regionId },
        orderBy: { period: 'desc' },
        take: 20,
      }),
      db.riskProfile.findMany({
        where: { regionId },
        orderBy: { profileDate: 'desc' },
        take: 10,
      }),
    ]);

    const context = {
      regionId: region.id,
      regionName: region.name,
      totalPopulation: region.population || 0,
      municipalities: region.municipalities.map(m => ({
        name: m.name,
        population: m.population || 0,
        riskScore: m.riskProfiles[0]?.riskScore || 0,
        riskLevel: m.riskProfiles[0]?.riskLevel || 'LOW',
      })),
      indicators: indicators.map(i => ({
        code: i.indicatorCode,
        name: i.indicatorName,
        value: i.value,
        unit: i.unit || '',
        trend: 'estável',
        period: i.period,
      })),
      riskProfiles: riskProfiles.map(rp => ({
        category: rp.category,
        riskScore: rp.riskScore,
        riskLevel: rp.riskLevel,
        trendDirection: rp.trendDirection || 'stable',
        contributingFactors: rp.contributingFactors ? JSON.parse(rp.contributingFactors) : [],
      })),
      alerts: [],
    };

    const results = await orchestratePopulationHealthAnalysis(context);

    logger.info('dashboard_analysis_complete', { regionId });

    return NextResponse.json({
      success: true,
      epidemiological: results.epiResult.data,
      recommendations: results.recommendationResult?.data,
      narrative: results.narrativeResult?.data,
      processingMs: results.epiResult.processingMs,
    });
  } catch (error) {
    logger.error('dashboard_analysis_error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
