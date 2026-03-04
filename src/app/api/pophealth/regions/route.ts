// ============================================================
// POPULATION HEALTH API - Regions and Municipalities
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logger } from '@/lib/logger';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');
    const municipalityId = searchParams.get('municipalityId');

    if (municipalityId) {
      const municipality = await db.municipality.findUnique({
        where: { id: municipalityId },
        include: {
          region: true,
          facilities: true,
          riskProfiles: { orderBy: { profileDate: 'desc' }, take: 5 },
        },
      });

      if (!municipality) {
        return NextResponse.json({ error: 'Municipality not found' }, { status: 404 });
      }

      return NextResponse.json({ municipality });
    }

    if (regionId) {
      const region = await db.healthRegion.findUnique({
        where: { id: regionId },
        include: {
          municipalities: {
            include: {
              facilities: true,
              riskProfiles: { orderBy: { profileDate: 'desc' }, take: 1 },
            },
          },
          facilities: true,
          riskProfiles: { orderBy: { profileDate: 'desc' }, take: 10 },
          recommendations: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      });

      if (!region) {
        return NextResponse.json({ error: 'Region not found' }, { status: 404 });
      }

      return NextResponse.json({ region });
    }

    // Return all regions with summary
    const regions = await db.healthRegion.findMany({
      include: {
        municipalities: {
          include: {
            riskProfiles: { orderBy: { profileDate: 'desc' }, take: 1 },
          },
        },
        _count: {
          select: { municipalities: true, facilities: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const regionsWithStats = regions.map(region => {
      const avgRiskScore = region.municipalities.reduce((sum, m) => {
        return sum + (m.riskProfiles[0]?.riskScore || 0);
      }, 0) / (region.municipalities.length || 1);

      return {
        ...region,
        averageRiskScore: Math.round(avgRiskScore),
      };
    });

    logger.info('regions_listed', { count: regions.length });

    return NextResponse.json({ regions: regionsWithStats });
  } catch (error) {
    logger.error('regions_api_error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(handler);
