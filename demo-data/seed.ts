// ============================================================
// SYNTHETIC DATA FOR DEMONSTRATION
// Clinical and Population Health Demo Data
// ============================================================

import { PrismaClient, UserRole, Priority, EncounterType, EncounterStatus, SessionStatus, ConditionStatus, AllergySeverity, AllergyStatus, MedicationStatus, TimelineEventType, AlertType, AlertSeverity, RiskLevel, RecommendationStatus, IngestionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const randomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomInt = (min: number, max: number): number => 
  Math.floor(Math.random() * (max - min + 1)) + min;

// ============================================================
// DEMO DATA DEFINITIONS
// ============================================================

const demoUsers = [
  { email: 'admin@saude.gov.br', name: 'Administrador Sistema', role: UserRole.ADMIN },
  { email: 'medico@ubs.gov.br', name: 'Dra. Ana Cardiologista', role: UserRole.PHYSICIAN },
  { email: 'enfermeiro@ubs.gov.br', name: 'Enf. Carlos Triagem', role: UserRole.NURSE },
  { email: 'gestor@regional.gov.br', name: 'Maria Gestora', role: UserRole.HEALTH_MANAGER },
];

const demoPatients = [
  {
    name: 'João Silva Santos',
    birthDate: new Date('1965-03-15'),
    sex: 'M',
    race: 'pardo',
    addressCity: 'São Paulo',
    addressState: 'SP',
    bloodType: 'A+',
    conditions: [
      { name: 'Hipertensão Arterial Sistêmica', code: 'I10', status: ConditionStatus.ACTIVE, onsetDate: new Date('2015-06-20') },
      { name: 'Diabetes Mellitus Tipo 2', code: 'E11', status: ConditionStatus.ACTIVE, onsetDate: new Date('2018-03-10') },
      { name: 'Dislipidemia', code: 'E78', status: ConditionStatus.ACTIVE, onsetDate: new Date('2019-01-15') },
    ],
    medications: [
      { name: 'Losartana 50mg', dosage: '50mg', frequency: '1x ao dia', indication: 'Hipertensão' },
      { name: 'Metformina 850mg', dosage: '850mg', frequency: '2x ao dia', indication: 'Diabetes' },
      { name: 'Sinvastatina 20mg', dosage: '20mg', frequency: '1x ao dia (noite)', indication: 'Dislipidemia' },
    ],
    allergies: [
      { substance: 'Dipirona', reaction: 'Erupção cutânea', severity: AllergySeverity.MODERATE },
    ],
  },
  {
    name: 'Maria Oliveira Costa',
    birthDate: new Date('1978-08-22'),
    sex: 'F',
    race: 'branca',
    addressCity: 'São Paulo',
    addressState: 'SP',
    bloodType: 'O+',
    conditions: [
      { name: 'Asma Brônquica', code: 'J45', status: ConditionStatus.ACTIVE, onsetDate: new Date('2010-04-12') },
    ],
    medications: [
      { name: 'Salbutamol Spray', dosage: '100mcg', frequency: 'SOS', indication: 'Asma' },
      { name: 'Budesonida Inalatório', dosage: '200mcg', frequency: '2x ao dia', indication: 'Asma' },
    ],
    allergies: [],
  },
  {
    name: 'Pedro Henrique Lima',
    birthDate: new Date('1955-11-30'),
    sex: 'M',
    race: 'preto',
    addressCity: 'São Paulo',
    addressState: 'SP',
    bloodType: 'B+',
    conditions: [
      { name: 'Diabetes Mellitus Tipo 2', code: 'E11', status: ConditionStatus.ACTIVE, onsetDate: new Date('2008-09-15') },
      { name: 'Nefropatia Diabética', code: 'E11.2', status: ConditionStatus.ACTIVE, onsetDate: new Date('2020-02-20') },
      { name: 'Retinopatia Diabética', code: 'E11.3', status: ConditionStatus.ACTIVE, onsetDate: new Date('2019-07-10') },
    ],
    medications: [
      { name: 'Insulina Glargina', dosage: '24UI', frequency: '1x ao dia', indication: 'Diabetes' },
      { name: 'Insulina Regular', dosage: '8-8-8UI', frequency: '3x ao dia', indication: 'Diabetes' },
      { name: 'Enalapril 10mg', dosage: '10mg', frequency: '1x ao dia', indication: 'Nefropatia' },
    ],
    allergies: [
      { substance: 'Contraste Iodado', reaction: 'Reação anafilática', severity: AllergySeverity.SEVERE },
    ],
  },
  {
    name: 'Ana Paula Ferreira',
    birthDate: new Date('1990-05-18'),
    sex: 'F',
    race: 'parda',
    addressCity: 'São Paulo',
    addressState: 'SP',
    bloodType: 'AB-',
    conditions: [
      { name: 'Síndrome do Intestino Irritável', code: 'K58', status: ConditionStatus.ACTIVE, onsetDate: new Date('2018-11-05') },
    ],
    medications: [
      { name: 'Escitalopram 10mg', dosage: '10mg', frequency: '1x ao dia', indication: 'Ansiedade' },
    ],
    allergies: [],
  },
  {
    name: 'Carlos Eduardo Souza',
    birthDate: new Date('1985-02-14'),
    sex: 'M',
    race: 'branco',
    addressCity: 'São Paulo',
    addressState: 'SP',
    bloodType: 'O-',
    conditions: [
      { name: 'Transtorno Depressivo Maior', code: 'F33', status: ConditionStatus.ACTIVE, onsetDate: new Date('2020-06-15') },
      { name: 'Transtorno de Ansiedade Generalizada', code: 'F41.1', status: ConditionStatus.ACTIVE, onsetDate: new Date('2019-03-20') },
    ],
    medications: [
      { name: 'Sertralina 100mg', dosage: '100mg', frequency: '1x ao dia', indication: 'Depressão' },
      { name: 'Clonazepam 0,5mg', dosage: '0,5mg', frequency: 'SOS', indication: 'Ansiedade' },
    ],
    allergies: [],
  },
];

const healthRegions = [
  { code: 'SP-01', name: 'Região Metropolitana de São Paulo', state: 'SP', population: 21500000, areaKm2: 7947, latitude: -23.5505, longitude: -46.6333 },
  { code: 'SP-02', name: 'Região de Campinas', state: 'SP', population: 3200000, areaKm2: 3791, latitude: -22.9099, longitude: -47.0626 },
  { code: 'SP-03', name: 'Vale do Paraíba', state: 'SP', population: 2400000, areaKm2: 16000, latitude: -23.2219, longitude: -45.8967 },
];

const municipalities = [
  { code: '3550308', name: 'São Paulo', state: 'SP', regionIdx: 0, population: 11451245, urban: 11420897, rural: 30348, area: 1521.11, lat: -23.5505, lng: -46.6333 },
  { code: '3509502', name: 'Campinas', state: 'SP', regionIdx: 1, population: 1223237, urban: 1186523, rural: 36714, area: 794.44, lat: -22.9099, lng: -47.0626 },
  { code: '3526902', name: 'Limeira', state: 'SP', regionIdx: 1, population: 308482, urban: 295823, rural: 12659, area: 581.62, lat: -22.5649, lng: -47.4017 },
  { code: '3543402', name: 'Ribeirão Preto', state: 'SP', regionIdx: 1, population: 711824, urban: 699556, rural: 12268, area: 650.37, lat: -21.1775, lng: -47.8103 },
  { code: '3549905', name: 'São José dos Campos', state: 'SP', regionIdx: 2, population: 731887, urban: 712598, rural: 19289, area: 1099.72, lat: -23.1791, lng: -45.8872 },
  { code: '3534401', name: 'Osasco', state: 'SP', regionIdx: 0, population: 699944, urban: 699944, rural: 0, area: 64.93, lat: -23.5320, lng: -46.7917 },
  { code: '3506008', name: 'Barueri', state: 'SP', regionIdx: 0, population: 276673, urban: 276673, rural: 0, area: 64.13, lat: -23.5110, lng: -46.8756 },
  { code: '3518800', name: 'Guarulhos', state: 'SP', regionIdx: 0, population: 1392126, urban: 1392126, rural: 0, area: 318.68, lat: -23.4543, lng: -46.5337 },
  { code: '3547809', name: 'Santo André', state: 'SP', regionIdx: 0, population: 716418, urban: 716418, rural: 0, area: 174.84, lat: -23.6666, lng: -46.5322 },
  { code: '3548708', name: 'São Bernardo do Campo', state: 'SP', regionIdx: 0, population: 844483, urban: 844483, rural: 0, area: 409.49, lat: -23.6944, lng: -46.5653 },
];

const indicatorTemplates = [
  { code: 'TX_INTRN_DCNt', name: 'Taxa de Internação por DCNT', category: 'morbidity', unit: 'por 10.000 hab' },
  { code: 'TX_OBITO_INFANT', name: 'Taxa de Mortalidade Infantil', category: 'mortality', unit: 'por 1.000 nascidos vivos' },
  { code: 'COB_PNI', name: 'Cobertura da PNI', category: 'coverage', unit: '%' },
  { code: 'COB_HIPERT', name: 'Cobertura de Hipertensos', category: 'coverage', unit: '%' },
  { code: 'COB_DIAB', name: 'Cobertura de Diabéticos', category: 'coverage', unit: '%' },
  { code: 'TX_LEITOS_SUS', name: 'Taxa de Leitos SUS', category: 'capacity', unit: 'por 1.000 hab' },
  { code: 'TX_CONS_PREV', name: 'Taxa de Consultas Preventivas', category: 'access', unit: 'por 1.000 hab' },
  { code: 'TX_INT_CV', name: 'Internações por Causas Cardiovasculares', category: 'morbidity', unit: 'por 10.000 hab' },
  { code: 'TX_INT_RESP', name: 'Internações por Causas Respiratórias', category: 'morbidity', unit: 'por 10.000 hab' },
  { code: 'POP_60MAIS', name: 'População 60 Anos ou Mais', category: 'demographic', unit: '%' },
];

export const redFlagRules = [
  {
    id: 'RF001',
    name: 'Dor Torácica Intensa',
    keywords: ['dor no peito', 'dor torácica', 'aperto no peito', 'peso no peito'],
    conditions: ['intensa', 'forte', 'severa', 'irradiada', 'para o braço', 'para o queixo'],
    severity: 'critical' as const,
    recommendation: 'Encaminhamento imediato para avaliação médica de urgência',
  },
  {
    id: 'RF002',
    name: 'Dispneia Grave',
    keywords: ['falta de ar', 'dificuldade para respirar', 'dispneia', 'engasgado'],
    conditions: ['em repouso', 'intensa', 'inesperada', 'progressiva'],
    severity: 'critical' as const,
    recommendation: 'Avaliação médica imediata - possível insuficiência respiratória',
  },
  {
    id: 'RF003',
    name: 'Déficit Neurológico Agudo',
    keywords: ['fraqueza', 'formigamento', 'paralisia', 'dormência', 'dificuldade para falar', 'boca torta'],
    conditions: ['súbito', 'abrupto', 'unilateral', 'face', 'braço', 'perna'],
    severity: 'critical' as const,
    recommendation: 'Possível AVC - acionar SAMU imediatamente',
  },
  {
    id: 'RF004',
    name: 'Febre Persistente em Contexto de Risco',
    keywords: ['febre', 'temperatura alta', 'calafrios'],
    conditions: ['persistente', 'mais de 3 dias', 'imunossuprimido', 'criança', 'idoso'],
    severity: 'high' as const,
    recommendation: 'Avaliação médica urgente para investigação de infecção grave',
  },
  {
    id: 'RF005',
    name: 'Sangramento Importante',
    keywords: ['sangramento', 'sangue', 'hemorragia'],
    conditions: ['abundante', 'intenso', 'não para', 'fezes', 'urina', 'vômito'],
    severity: 'critical' as const,
    recommendation: 'Avaliação médica imediata - possível emergência hemorrágica',
  },
  {
    id: 'RF006',
    name: 'Rebaixamento de Consciência',
    keywords: ['desmaio', 'perda de consciência', 'sonolência', 'confusão', 'desorientado'],
    conditions: ['súbito', 'progressivo', 'sem causa aparente'],
    severity: 'critical' as const,
    recommendation: 'Emergência neurológica ou metabólica - atendimento imediato',
  },
  {
    id: 'RF007',
    name: 'Ideação Suicida',
    keywords: ['morrer', 'matando', 'suicídio', 'acabar com tudo', 'sem vontade de viver', 'pensamentos de morte'],
    conditions: [],
    severity: 'critical' as const,
    recommendation: 'Risco de vida - acionar equipe de saúde mental imediatamente',
  },
  {
    id: 'RF008',
    name: 'Desidratação Grave',
    keywords: ['desidratado', 'muito seco', 'não urina', 'boca seca'],
    conditions: ['criança', 'idoso', 'vômitos', 'diarreia intensa'],
    severity: 'high' as const,
    recommendation: 'Avaliação médica urgente - possível necessidade de hidratação venosa',
  },
  {
    id: 'RF009',
    name: 'Sinais de Sepse',
    keywords: ['confusão', 'pressão baixa', 'taquicardia', 'febre', 'calafrios intensos'],
    conditions: ['infecção conhecida', 'piora rápida'],
    severity: 'critical' as const,
    recommendation: 'Possível sepse - emergência médica imediata',
  },
  {
    id: 'RF010',
    name: 'Piora Abrupta de Quadro Crônico',
    keywords: ['piorou', 'descompensou', 'aumentou muito'],
    conditions: ['diabetes descompensada', 'hipertensão descompensada', 'insuficiência cardíaca', 'DPOC'],
    severity: 'high' as const,
    recommendation: 'Avaliação médica urgente para estabilização',
  },
];

// ============================================================
// SEED FUNCTION WITH UPSERTS
// ============================================================

async function main() {
  console.log('🌱 Starting seed...');

  // Check if already seeded
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('⚠️ Database already has data. Skipping seed...');
    console.log('💡 To reseed, run: rm db/custom.db && bun run db:push && bun run demo-data/seed.ts');
    return;
  }

  // Create users with upsert
  console.log('Creating users...');
  const createdUsers = [];
  for (const user of demoUsers) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash: await bcrypt.hash('demo123', 10),
      },
    });
    createdUsers.push(created);
    console.log(`  ✓ User: ${user.name}`);
  }

  // Create patients with full clinical data
  console.log('\nCreating patients with clinical data...');
  
  for (const patientData of demoPatients) {
    // Create user for patient
    const patientEmail = `paciente.${patientData.name.toLowerCase().replace(/ /g, '.')}@demo.com`;
    const patientUserCreated = await prisma.user.upsert({
      where: { email: patientEmail },
      update: {},
      create: {
        email: patientEmail,
        name: patientData.name,
        role: UserRole.PATIENT,
        passwordHash: await bcrypt.hash('demo123', 10),
      },
    });

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        userId: patientUserCreated.id,
        name: patientData.name,
        birthDate: patientData.birthDate,
        sex: patientData.sex,
        race: patientData.race,
        addressCity: patientData.addressCity,
        addressState: patientData.addressState,
        bloodType: patientData.bloodType,
      },
    });
    console.log(`  ✓ Patient: ${patientData.name}`);

    // Create conditions
    for (const cond of patientData.conditions) {
      await prisma.conditionHistory.create({
        data: {
          patientId: patient.id,
          conditionName: cond.name,
          conditionCode: cond.code,
          status: cond.status,
          onsetDate: cond.onsetDate,
          verified: true,
          source: 'clinical_record',
        },
      });
    }

    // Create medications
    for (const med of patientData.medications) {
      await prisma.medication.create({
        data: {
          patientId: patient.id,
          medicationName: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          indication: med.indication,
          status: MedicationStatus.ACTIVE,
          source: 'prescription',
        },
      });
    }

    // Create allergies
    for (const allergy of patientData.allergies) {
      await prisma.allergy.create({
        data: {
          patientId: patient.id,
          substance: allergy.substance,
          reaction: allergy.reaction,
          severity: allergy.severity,
          status: AllergyStatus.ACTIVE,
          verified: true,
        },
      });
    }

    // Create vital signs
    const vitalTypes = [
      { type: 'blood_pressure', value: randomInt(110, 140), systolic: randomInt(110, 140), diastolic: randomInt(70, 90), unit: 'mmHg' },
      { type: 'heart_rate', value: randomInt(60, 100), unit: 'bpm' },
      { type: 'temperature', value: randomInt(360, 375) / 10, unit: '°C' },
      { type: 'weight', value: randomInt(500, 900) / 10, unit: 'kg' },
      { type: 'height', value: randomInt(150, 180), unit: 'cm' },
    ];

    for (const vital of vitalTypes) {
      await prisma.vitalSign.create({
        data: {
          patientId: patient.id,
          vitalType: vital.type,
          value: vital.value,
          systolic: vital.systolic,
          diastolic: vital.diastolic,
          unit: vital.unit,
          effectiveDate: new Date(),
        },
      });
    }

    // Create timeline events
    const timelineEvents = [
      { type: TimelineEventType.DIAGNOSIS, title: 'Diagnóstico Inicial', description: patientData.conditions[0]?.name || 'Consulta inicial', eventDate: patientData.conditions[0]?.onsetDate || new Date() },
      { type: TimelineEventType.CONSULTATION, title: 'Consulta de Rotina', description: 'Acompanhamento regular', eventDate: randomDate(new Date('2024-01-01'), new Date()) },
    ];

    for (const event of timelineEvents) {
      await prisma.clinicalTimelineEvent.create({
        data: {
          patientId: patient.id,
          eventType: event.type,
          title: event.title,
          description: event.description,
          eventDate: event.eventDate,
          significance: 'medium',
        },
      });
    }

    // Create lab results for diabetic patients
    if (patientData.conditions.some(c => c.code?.includes('E11'))) {
      await prisma.labResult.create({
        data: {
          patientId: patient.id,
          testName: 'Hemoglobina Glicada (HbA1c)',
          testCode: '4548-4',
          testCategory: 'biochemistry',
          resultValue: String(randomInt(70, 95) / 10),
          resultUnit: '%',
          referenceRange: '< 7.0%',
          interpretation: randomInt(70, 80) / 10 > 7 ? 'high' : 'normal',
          collectionDate: randomDate(new Date('2024-06-01'), new Date()),
          resultDate: new Date(),
        },
      });
    }

    // Create pre-consultation session
    const session = await prisma.preConsultationSession.create({
      data: {
        patientId: patient.id,
        userId: patientUserCreated.id,
        status: SessionStatus.ACTIVE,
        primaryComplaint: '',
        aiModelVersion: 'v1.0.0',
      },
    });

    // Create initial chat message
    await prisma.chatMessage.createMany({
      data: [
        {
          sessionId: session.id,
          role: 'ASSISTANT',
          content: `Olá, ${patientData.name.split(' ')[0]}! Sou o assistente de pré-consulta. Vou fazer algumas perguntas para preparar sua consulta. Qual é o principal motivo da sua consulta hoje?`,
        },
      ],
    });

    // Create triage assessment
    await prisma.triageAssessment.create({
      data: {
        patientId: patient.id,
        sessionId: session.id,
        priority: Priority.ROUTINE,
        priorityRationale: 'Aguardando informações do paciente',
        urgencyScore: 0,
        redFlagCount: 0,
        dataCompleteness: 0,
        confidenceScore: 0,
      },
    });
  }

  // Create health regions
  console.log('\nCreating health regions...');
  const createdRegions = [];
  for (const region of healthRegions) {
    const created = await prisma.healthRegion.create({
      data: {
        code: region.code,
        name: region.name,
        state: region.state,
        population: region.population,
        areaKm2: region.areaKm2,
        latitude: region.latitude,
        longitude: region.longitude,
      },
    });
    createdRegions.push(created);
    console.log(`  ✓ Region: ${region.name}`);
  }

  // Create municipalities
  console.log('\nCreating municipalities...');
  const createdMunicipalities = [];
  for (const muni of municipalities) {
    const created = await prisma.municipality.create({
      data: {
        code: muni.code,
        name: muni.name,
        state: muni.state,
        regionId: createdRegions[muni.regionIdx].id,
        population: muni.population,
        urbanPopulation: muni.urban,
        ruralPopulation: muni.rural,
        areaKm2: muni.area,
        latitude: muni.lat,
        longitude: muni.lng,
      },
    });
    createdMunicipalities.push(created);
    console.log(`  ✓ Municipality: ${muni.name}`);

    // Create facility
    await prisma.facility.create({
      data: {
        cnes: `${muni.code}001`,
        name: `UBS Central ${muni.name}`,
        facilityType: 'UBS',
        regionId: createdRegions[muni.regionIdx].id,
        municipalityId: created.id,
        latitude: muni.lat,
        longitude: muni.lng,
        beds: randomInt(5, 20),
      },
    });

    // Create population indicators
    for (const indicator of indicatorTemplates) {
      const baseValue = indicator.category === 'coverage' ? randomInt(60, 95) : randomInt(10, 50);
      await prisma.populationIndicator.create({
        data: {
          regionId: createdRegions[muni.regionIdx].id,
          municipalityId: created.id,
          indicatorCode: indicator.code,
          indicatorName: indicator.name,
          category: indicator.category,
          value: baseValue,
          unit: indicator.unit,
          period: '2024',
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-12-31'),
          dataSource: 'DATASUS',
          dataQuality: 0.85 + Math.random() * 0.1,
        },
      });
    }

    // Create risk profile
    await prisma.riskProfile.create({
      data: {
        regionId: createdRegions[muni.regionIdx].id,
        municipalityId: created.id,
        profileDate: new Date(),
        riskScore: randomInt(20, 80),
        riskLevel: randomElement(['VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'] as RiskLevel[]),
        category: 'cardiometabolic',
        contributingFactors: JSON.stringify(['Envelhecimento populacional', 'Sedentarismo', 'Hábitos alimentares']),
        trendDirection: randomElement(['increasing', 'decreasing', 'stable']),
        modelVersion: 'risk-v1.0',
        modelConfidence: 0.75 + Math.random() * 0.2,
      },
    });
  }

  // Create recommendations
  console.log('\nCreating recommendations...');
  for (const region of createdRegions) {
    await prisma.recommendation.create({
      data: {
        regionId: region.id,
        recommendationType: 'prevention_campaign',
        title: 'Campanha de Rastreamento de Hipertensão',
        description: 'Implementar campanha de rastreamento ativo de hipertensão arterial em áreas de maior risco.',
        rationale: 'Alta prevalência de hipertensão não diagnosticada na região',
        expectedImpact: 'Redução de 15% em internações por complicações cardiovasculares',
        confidenceLevel: 0.82,
        priority: 1,
        status: RecommendationStatus.PENDING,
        dataSource: JSON.stringify(['TX_INTRN_DCNt', 'COB_HIPERT']),
      },
    });

    await prisma.recommendation.create({
      data: {
        regionId: region.id,
        recommendationType: 'capacity_enhancement',
        title: 'Reforço de Capacidade em UBS',
        description: 'Ampliar horário de funcionamento das UBS em áreas com maior demanda.',
        rationale: 'Sobrecarga assistencial identificada em períodos de pico',
        expectedImpact: 'Aumento de 20% na cobertura de consultas',
        confidenceLevel: 0.75,
        priority: 2,
        status: RecommendationStatus.PENDING,
        dataSource: JSON.stringify(['TX_CONS_PREV', 'TX_LEITOS_SUS']),
      },
    });
  }

  // Create data ingestion job
  console.log('\nCreating data ingestion job...');
  await prisma.dataIngestionJob.create({
    data: {
      source: 'DATASUS-SIM',
      sourceUrl: 'http://datasus.saude.gov.br/sim',
      status: IngestionStatus.COMPLETED,
      recordsTotal: 125847,
      recordsValid: 123456,
      recordsInvalid: 2391,
      qualityScore: 0.98,
      startedAt: new Date('2024-10-01'),
      completedAt: new Date('2024-10-01'),
      durationMs: 45678,
    },
  });

  // Create prompt version
  console.log('\nCreating prompt versions...');
  await prisma.promptVersion.create({
    data: {
      promptName: 'clinical_interview',
      version: '1.0.0',
      content: `Você é um assistente de pré-consulta clínica especializado em atenção primária no contexto brasileiro.`,
      description: 'Prompt para agente de entrevista clínica',
      inputSchema: JSON.stringify({ type: 'object', properties: { message: { type: 'string' } } }),
      outputSchema: JSON.stringify({ type: 'object', properties: { response: { type: 'string' } } }),
      active: true,
    },
  });

  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
