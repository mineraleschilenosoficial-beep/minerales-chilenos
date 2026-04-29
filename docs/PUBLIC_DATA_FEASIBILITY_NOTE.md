# Public Data Feasibility Note

This note documents what can realistically be obtained from public sources for each mine/deposit record.

Important scope:

- This is a feasibility statement, not a guarantee of successful extraction for every record.
- Target is to collect public and traceable data only.
- Sensitive/private data must be excluded or marked as not publicly available.

## Fields That Are Usually Not Publicly Obtainable

- Salary by role at mine/deposit level (`average_salary` at role granularity).
- Exact direct/indirect workforce by mine in real time (`direct_workers`, `indirect_workers` with high granularity).
- Exact annual revenue by mine/deposit (`annual_revenue` per site).
- Exact 2026 hiring plan by mine/deposit (`hiring_plan_2026` at site level).
- Internal operational and contractual details not disclosed in public filings.

Policy for non-public fields:

- Do not fabricate values.
- Use `not_public` or `not_disclosed` when no reliable public source exists.
- Keep source evidence for the status decision.

## Fields With Realistic Public Feasibility

- `mining_company` (operator).
- `website` (official company or operation page).
- `operation_since` (operation start/year from official disclosures).
- `operating_authorizations` (public permits/resolutions where published).
- `environmental_reports` (public EIA/DIA and monitoring reports where available).
- `geology_studies` (public technical studies where available).
- `mineral_life_studies` (public reserve/life studies where available).
- `mitigation_studies` (public mitigation plans/reports where available).

## Execution Rule

- Prioritize only feasible public fields in extraction work.
- Treat sensitive fields as optional and status-driven (`not_public`, `not_disclosed`, `pending_verification`).
- Keep per-field metadata:
  - `source_url`
  - `source_name`
  - `updated_at`
  - `confidence_score`
  - `status`

## Communication Rule (For Stakeholders)

- Report feasibility and coverage separately:
  - Feasible in principle (can be public).
  - Successfully collected (actual current coverage).
- Avoid promising full completion across all records.

---

# Nota De Factibilidad De Datos Públicos (Español)

Esta nota documenta qué información se puede obtener de forma realista desde fuentes públicas para cada yacimiento/mina.

Alcance importante:

- Este documento expresa factibilidad, no garantía de éxito para cada registro.
- El objetivo es recolectar solo datos públicos y trazables.
- Los datos sensibles o privados deben excluirse o marcarse como no públicos.

## Campos Que Normalmente No Se Pueden Obtener De Forma Pública

- Sueldo por cargo a nivel de yacimiento (`average_salary` con granularidad por rol).
- Número exacto de trabajadores directos e indirectos en tiempo real (`direct_workers`, `indirect_workers` con alta granularidad).
- Ingresos anuales exactos por yacimiento (`annual_revenue` por faena).
- Plan exacto de contrataciones 2026 por yacimiento (`hiring_plan_2026` a nivel faena).
- Detalles operativos/contractuales internos no divulgados públicamente.

Política para campos no públicos:

- No inventar valores.
- Usar `not_public` o `not_disclosed` cuando no exista fuente pública confiable.
- Mantener evidencia de la decisión de estado.

## Campos Con Factibilidad Pública Realista

- `mining_company` (empresa operadora).
- `website` (sitio oficial corporativo o de la operación).
- `operation_since` (inicio de operación desde fuentes oficiales).
- `operating_authorizations` (permisos/resoluciones públicas cuando existan).
- `environmental_reports` (EIA/DIA e informes ambientales públicos cuando existan).
- `geology_studies` (estudios técnicos/geológicos públicos cuando existan).
- `mineral_life_studies` (estudios de vida útil/reservas públicos cuando existan).
- `mitigation_studies` (planes/estudios de mitigación públicos cuando existan).

## Regla De Ejecución

- Priorizar extracción solo para campos públicamente factibles.
- Tratar campos sensibles como opcionales y con estado explícito (`not_public`, `not_disclosed`, `pending_verification`).
- Mantener metadatos por campo:
  - `source_url`
  - `source_name`
  - `updated_at`
  - `confidence_score`
  - `status`

## Regla De Comunicación (Para Stakeholders)

- Reportar por separado:
  - Factible en principio (puede ser público).
  - Recopilado efectivamente (cobertura real actual).
- Evitar prometer cobertura total en todos los registros.
