# Plataforma de Inteligência Clínica e Saúde Populacional

Uma plataforma portfolio-grade para atenção primária e gestão regional de saúde no contexto brasileiro, composta por dois módulos integrados:

## 🏥 Módulo A: Agente Clínico de Pré-Consulta

Sistema de agentes de IA para triagem assistida em atenção primária:

- **Pré-consulta estruturada** com conversa em linguagem natural
- **Anamnese organizada** gerada automaticamente
- **Linha do tempo de saúde** do paciente
- **Detecção de red flags** com motor de regras
- **Resumo clínico** objetivo para o médico
- **Hipóteses diagnósticas diferenciais** com níveis de confiança
- **Classificação de prioridade** por urgência clínica

## 📊 Módulo B: Perfil de Saúde Populacional

Sistema de inteligência territorial para gestão de saúde:

- **Consolidação de dados públicos** de saúde em nível territorial
- **Perfis de risco populacional** por território
- **Detecção de anomalias** e tendências
- **Dashboard interativo** com indicadores e mapas
- **Recomendações assistidas por IA** para gestores

## 🏗️ Arquitetura

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Página principal
│   │   └── api/               # API Routes
│   │       ├── clinical/      # APIs do módulo clínico
│   │       └── pophealth/     # APIs do módulo populacional
│   ├── components/
│   │   ├── clinical/          # Componentes do módulo clínico
│   │   ├── pophealth/         # Componentes do módulo populacional
│   │   └── ui/                # Componentes shadcn/ui
│   └── lib/
│       ├── agents/            # Agentes de IA
│       ├── schemas/           # Schemas Zod para validação
│       └── prompts/           # Prompts versionados
├── prisma/
│   └── schema.prisma          # Modelo de dados canônico
├── demo-data/
│   └── seed.ts                # Dados sintéticos para demonstração
└── db/
    └── custom.db              # Banco SQLite
```

## 🛠️ Stack Tecnológica

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, React Query
- **Backend**: Next.js API Routes, Prisma ORM
- **Banco de Dados**: SQLite (desenvolvimento) / PostgreSQL (produção)
- **IA**: z-ai-web-dev-sdk (LLM multimodal)
- **Validação**: Zod schemas
- **Gráficos**: Recharts

## 🚀 Como Executar

### Pré-requisitos

- Node.js 18+ ou Bun
- npm ou bun

### Instalação

```bash
# Instalar dependências
bun install

# Configurar banco de dados
bun run db:push

# Popular com dados de demonstração
bun run demo-data/seed.ts

# Executar em desenvolvimento
bun run dev
```

### Acesso

Abra http://localhost:3000 no navegador.

## 📋 Modelo de Dados

### Módulo Clínico

- **Patient**: Dados demográficos e informações do paciente
- **PreConsultationSession**: Sessão de pré-consulta
- **SymptomReport**: Sintomas reportados
- **ChatMessage**: Mensagens do chat
- **TriageAssessment**: Avaliação de triagem
- **ClinicalSummary**: Resumo clínico gerado
- **DifferentialHypothesis**: Hipóteses diagnósticas
- **ConditionHistory**: Histórico de condições
- **Medication**: Medicamentos em uso
- **Allergy**: Alergias conhecidas
- **ClinicalTimelineEvent**: Eventos da linha do tempo

### Módulo Populacional

- **HealthRegion**: Regional de saúde
- **Municipality**: Município
- **Facility**: Estabelecimento de saúde
- **PopulationIndicator**: Indicadores populacionais
- **RiskProfile**: Perfis de risco
- **Recommendation**: Recomendações para gestão
- **AnomalyDetection**: Detecção de anomalias

## 🤖 Agentes de IA

### Módulo Clínico

1. **Clinical Interview Agent**: Conduz entrevista estruturada
2. **Triage Agent**: Classifica prioridade e detecta red flags
3. **Summary Agent**: Gera resumo clínico para médico
4. **Hypothesis Agent**: Gera hipóteses diferenciais

### Módulo Populacional

1. **Epidemiological Agent**: Interpreta dados epidemiológicos
2. **Recommendation Agent**: Gera recomendações de saúde coletiva
3. **Narrative Agent**: Cria narrativa executiva para dashboard

## ⚠️ Segurança Clínica

**IMPORTANTE**: Este sistema é uma ferramenta de apoio à decisão clínica, NÃO um substituto do médico.

- ❌ Não faz diagnósticos definitivos
- ❌ Não prescreve tratamento
- ❌ Não orienta conduta medicamentosa
- ✅ Sinaliza red flags e urgências
- ✅ Exibe níveis de confiança/incerteza
- ✅ Separa fatos de inferências
- ✅ Mantém trilha de auditoria

## 🔒 Privacidade e LGPD

- Minimização de dados
- Segregação de dados sensíveis
- Logs de auditoria
- Pseudonimização quando aplicável
- Arquitetura preparada para consentimento

## 📊 Dados de Demonstração

O sistema inclui 5 casos sintéticos completos:

1. **Hipertensão descompensada** - João Silva Santos
2. **Infecção respiratória com red flag** - Maria Oliveira Costa
3. **Diabetes com exame alterado** - Pedro Henrique Lima
4. **Dor abdominal inespecífica** - Ana Paula Ferreira
5. **Saúde mental com sinal de alerta** - Carlos Eduardo Souza

E 3 regionais de saúde com 10 municípios do estado de São Paulo.

## 📈 Funcionalidades

### Módulo Clínico

- [x] Chat de pré-consulta com IA
- [x] Extração estruturada de sintomas
- [x] Detecção de red flags
- [x] Classificação de prioridade
- [x] Linha do tempo do paciente
- [x] Resumo clínico para médico
- [x] Hipóteses diagnósticas diferenciais
- [x] Níveis de confiança e limitações

### Módulo Populacional

- [x] Dashboard de indicadores
- [x] Mapa de risco territorial
- [x] Distribuição de risco
- [x] Perfis de risco por categoria
- [x] Recomendações para gestão
- [x] Análise epidemiológica com IA
- [x] Narrativa executiva

## 🔧 Scripts Disponíveis

```bash
bun run dev          # Desenvolvimento
bun run build        # Build de produção
bun run lint         # Verificação de código
bun run db:push      # Sincronizar schema
bun run db:generate  # Gerar Prisma Client
```

## 📝 Próximos Passos

- [ ] Autenticação com NextAuth.js
- [ ] RBAC completo
- [ ] Testes automatizados
- [ ] Docker Compose
- [ ] Integração com FHIR
- [ ] Conectores DATASUS reais
- [ ] Monitoramento e observabilidade
- [ ] PWA para uso offline

## 📄 Licença

Este é um projeto de demonstração para fins de portfólio.

---

**Desenvolvido com foco em qualidade arquitetural, segurança clínica e usabilidade profissional.**
