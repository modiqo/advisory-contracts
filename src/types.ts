export type SchemaVersion = "v1";
export type Sensitivity = "public" | "internal" | "confidential" | "restricted";
export type Confidence = "low" | "medium" | "high";

export interface DecisionContext {
  schema_version: SchemaVersion;
  decision_id: string;
  question: string;
  actor: string;
  trigger: { kind: string; occurred_at: string; reference?: string };
  decision_deadline?: string;
  stakes: "low" | "medium" | "high" | "critical";
  reversibility: "reversible" | "costly" | "irreversible";
  constraints: string[];
  permitted_actions?: string[];
  extensions?: Record<string, unknown>;
}

export interface SourceSpec {
  schema_version: SchemaVersion;
  source_id: string;
  capability: string;
  required: boolean;
  freshness_sla_seconds?: number;
  failure_mode: "block" | "degrade" | "skip";
  sensitivity: Sensitivity;
  config?: Record<string, unknown>;
}

export interface EvidenceItem {
  evidence_id: string;
  source: string;
  source_family: string;
  subject: string;
  claim: string;
  stance: "supports" | "opposes" | "neutral" | "unknown";
  observed_at: string;
  fresh_until?: string;
  confidence: { level: Confidence; reason: string };
  sensitivity: Sensitivity;
  raw_reference: {
    kind: "url" | "adapter-response" | "file" | "message" | "record" | "manual";
    value: string;
    content_hash?: string;
  };
  extensions?: Record<string, unknown>;
}

export interface EvidenceBundle {
  schema_version: SchemaVersion;
  bundle_id: string;
  decision_id: string;
  generated_at: string;
  items: EvidenceItem[];
  degraded_sources: Array<{ source: string; reason: string; last_success_at?: string }>;
  extensions?: Record<string, unknown>;
}

export interface AdvisoryRubric {
  schema_version: SchemaVersion;
  rubric_id: string;
  title: string;
  source: { provider: string; collection?: string; skill_id: string; server_version?: string; loaded_at: string };
  applicability: string;
  criteria: Array<{ criterion_id: string; question: string; weight?: number; evidence_requirements?: string[] }>;
  disqualifiers: string[];
  required_questions: string[];
  attribution_links: string[];
  extensions?: Record<string, unknown>;
}

export interface ActionIntent {
  schema_version: SchemaVersion;
  action_id: string;
  decision_id: string;
  action_type: string;
  destination: string;
  owner?: string;
  due_at?: string;
  payload_preview: Record<string, unknown>;
  rationale_evidence_ids: string[];
  approval: {
    required: boolean;
    state: "not-required" | "proposed" | "approved" | "rejected";
    approved_by?: string;
    approved_at?: string;
  };
  status: "proposed" | "ready" | "executed" | "cancelled" | "failed";
  idempotency_key?: string;
  extensions?: Record<string, unknown>;
}

export interface Decision {
  schema_version: SchemaVersion;
  decision_id: string;
  generated_at: string;
  recommendation: string;
  alternatives?: Array<{ label: string; disposition: "preferred" | "viable" | "rejected" | "deferred"; reason: string }>;
  scqa: { situation: string; complication: string; question: string; answer: string };
  evidence_for: string[];
  evidence_against: string[];
  unknowns: string[];
  confidence: Confidence;
  assumptions: string[];
  reversibility: "reversible" | "costly" | "irreversible";
  decision_deadline?: string;
  success_threshold: string;
  kill_criteria: string[];
  actions: ActionIntent[];
  extensions?: Record<string, unknown>;
}
