# Source Priority Matrix (Mandatory Fields)

This matrix defines source precedence and minimum evidence to accept each mandatory field in production.

## Priority Levels

- **P1 (Official):** Regulator/government portal, official resolution, or official operator publication.
- **P2 (Regulated):** Audited/regulated filing (annual report, sustainability report, technical disclosure).
- **P3 (Verified Corporate):** Official corporate disclosure with explicit mine-level context.
- **P4 (Manual Verified):** Analyst-curated value with source URL and review note.

## Matrix

| Field | P1 (preferred) | P2 | P3 | P4 fallback | Minimum validation |
|---|---|---|---|---|---|
| `mining_company` | Official mine/operator registry | Audited annual report | Official operations page | Manual override | Operator name matches mine context and source date |
| `website` | Official regulator/company registry URL | Audited report URL | Official domain in operations page | Manual override | URL reachable and domain consistent with operator |
| `operation_since` | Permit/start-operation resolution | Audited timeline/history | Official corporate history page | Manual override | Date/year explicit in source and mine-level scoped |
| `direct_workers` | Government labor disclosure (mine scoped) | Sustainability report (mine scoped) | Official workforce communication | Manual override | Numeric value and year required |
| `indirect_workers` | Government labor disclosure (mine scoped) | Sustainability report (mine scoped) | Official workforce communication | Manual override | Numeric value and year required |
| `average_salary` | Official payroll disclosure (mine scoped) | Regulated compensation disclosure | Official salary framework | Manual override | Amount + currency + period required |
| `annual_revenue` | Mine-level audited revenue disclosure | Segment audited disclosure with explicit mine mapping | Official production/revenue disclosure | Manual override | Amount + currency + fiscal year required |
| `hiring_plan_2026` | Approved expansion/project document | Regulated company guidance | Official hiring plan publication | Manual override | Explicitly references 2026 and mine scope |
| `operating_authorizations` | Official authority resolution/permit portal | Regulated compliance filing | Official operator compliance page | Manual override | Resolution ID + authority + validity/effective date |
| `environmental_reports` | Official environmental portal (approved docs) | Regulated EIA/DIA publication | Official operator report with URL | Manual override | Report type + period/date + URL |
| `geology_studies` | Official technical filing portal | NI 43-101/JORC technical report | Official mine technical disclosure | Manual override | Publication date + mine identification |
| `mineral_life_studies` | Official technical filing portal | NI 43-101/JORC reserve/life-of-mine section | Official technical disclosure | Manual override | Life/reserve section + publication date |
| `mitigation_studies` | Official approved mitigation plan registry | Regulated compliance filing | Official mitigation disclosure | Manual override | Project scope + mitigation scope + validity |

## Acceptance Rules

- Take the highest-priority available source (`P1` before `P2`, etc.).
- Store field-level provenance for every accepted value.
- Reject values without a valid source URL.
- Reject values failing minimum validation constraints.

