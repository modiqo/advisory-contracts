export type SchemaVersion = "v1";
export type Sensitivity = "public" | "internal" | "confidential" | "restricted";
export type Confidence = "low" | "medium" | "high";

export interface ContentSourceBase {
  schema_version: SchemaVersion;
  source_id: string;
  title?: string;
  content_hash?: string;
  extensions?: Record<string, unknown>;
}

export interface UriContentSource extends ContentSourceBase {
  kind: "uri";
  uri: string;
}

export interface MarkdownContentSource extends ContentSourceBase {
  kind: "markdown";
  markdown: string;
  base_uri?: string;
}

export type ContentSource = UriContentSource | MarkdownContentSource;

export interface PageExtraction {
  method: "rote-browse" | "markdown-parser";
  rendered: boolean;
  capture_reference: string;
  final_uri?: string;
  warnings: string[];
}

export interface PageEvidenceReference {
  evidence_id: string;
  locator: {
    kind: "browser-ref" | "css-selector" | "markdown-line-range" | "uri-fragment" | "capture-reference";
    value: string;
  };
  excerpt: string;
  content_hash?: string;
}

export interface LandingPagePositioning {
  headline: string | null;
  subheadline: string | null;
  audience: string | null;
  category: string | null;
  problem: string | null;
  promise: string | null;
  evidence_refs: string[];
}

export interface LandingPageCallToAction {
  cta_id: string;
  label: string;
  kind: "primary" | "secondary" | "navigation" | "form" | "contact" | "purchase" | "other";
  destination: string | null;
  evidence_refs: string[];
}

export interface LandingPageSection {
  section_id: string;
  order: number;
  section_type: "hero" | "problem" | "benefits" | "features" | "proof" | "how-it-works" | "comparison" | "pricing" | "objection" | "faq" | "cta" | "footer" | "other";
  heading: string | null;
  body_markdown: string;
  evidence_refs: string[];
}

export interface LandingPageProofItem {
  proof_id: string;
  kind: "testimonial" | "customer" | "metric" | "case-study" | "certification" | "media" | "other";
  claim: string;
  attribution: string | null;
  evidence_refs: string[];
}

export interface LandingPageSnapshot {
  schema_version: SchemaVersion;
  snapshot_id: string;
  source: ContentSource;
  captured_at: string;
  extraction: PageExtraction;
  positioning: LandingPagePositioning;
  calls_to_action: LandingPageCallToAction[];
  sections: LandingPageSection[];
  proof: LandingPageProofItem[];
  navigation: Array<{ label: string; destination: string; evidence_refs: string[] }>;
  metadata: {
    title: string | null;
    description: string | null;
    canonical_uri: string | null;
    h1: string[];
    h2: string[];
  };
  evidence: PageEvidenceReference[];
  unknowns: string[];
  extensions?: Record<string, unknown>;
}

export interface PricingPagePackaging {
  pricing_visibility: "public" | "partial" | "contact-sales" | "absent";
  model: "flat" | "per-seat" | "usage" | "tiered" | "hybrid" | "custom" | "unknown";
  value_metric: string | null;
  free_offer: string | null;
  trial: string | null;
  enterprise_motion: string | null;
  feature_differentiation: string[];
  evidence_refs: string[];
}

export interface PricingPlan {
  plan_id: string;
  name: string;
  description: string | null;
  audience: string | null;
  price: {
    amount: number | null;
    currency: string | null;
    cadence: "free" | "month" | "year" | "one-time" | "usage" | "custom";
    unit: string | null;
    qualifier: string | null;
  };
  features: string[];
  limits: string[];
  highlighted: boolean;
  evidence_refs: string[];
}

export interface PricingPageCallToAction {
  cta_id: string;
  label: string;
  kind: "start-free" | "start-trial" | "buy" | "contact-sales" | "book-demo" | "other";
  destination: string | null;
  plan_id: string | null;
  evidence_refs: string[];
}

export interface PricingPageSnapshot {
  schema_version: SchemaVersion;
  snapshot_id: string;
  source: ContentSource;
  captured_at: string;
  extraction: PageExtraction;
  target_customer: string | null;
  packaging: PricingPagePackaging;
  plans: PricingPlan[];
  calls_to_action: PricingPageCallToAction[];
  trust_signals: Array<{
    signal_id: string;
    kind: "customer" | "testimonial" | "metric" | "security" | "guarantee" | "case-study" | "other";
    claim: string;
    attribution: string | null;
    evidence_refs: string[];
  }>;
  objections_addressed: Array<{ statement: string; evidence_refs: string[] }>;
  pricing_ambiguities: Array<{ statement: string; evidence_refs: string[] }>;
  evidence: PageEvidenceReference[];
  unknowns: string[];
  extensions?: Record<string, unknown>;
}

export interface ConversationParticipant {
  participant_id?: string;
  display_name: string;
  email?: string;
  role?: "internal" | "customer" | "prospect" | "partner" | "investor" | "candidate" | "unknown";
}

export interface ConversationArtifact {
  schema_version: SchemaVersion;
  artifact_id: string;
  source: {
    provider: string;
    source_id: string;
    captured_at: string;
    raw_reference: {
      kind: "url" | "adapter-response" | "file" | "record" | "manual";
      value: string;
      content_hash?: string;
    };
  };
  title: string;
  started_at: string;
  ended_at?: string;
  participants: ConversationParticipant[];
  notes_markdown?: string;
  summary_markdown?: string;
  transcript_segments: Array<{
    segment_id: string;
    speaker?: { participant_id?: string; display_name?: string; provider_label?: string };
    start_seconds?: number;
    end_seconds?: number;
    text: string;
  }>;
  identified_decisions: Array<{ item_id: string; statement: string; owner?: string; evidence_refs: string[] }>;
  action_items: Array<{
    item_id: string;
    description: string;
    owner?: string;
    due_at?: string;
    status: "open" | "done" | "unknown";
    evidence_refs: string[];
  }>;
  evidence: Array<{
    evidence_id: string;
    locator: { kind: "transcript-segment" | "summary-fragment" | "notes-fragment" | "provider-reference"; value: string };
    excerpt: string;
    content_hash?: string;
  }>;
  unknowns: string[];
  sensitivity: Sensitivity;
  extensions?: Record<string, unknown>;
}

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

export interface OperatingBrief {
  schema_version: SchemaVersion;
  brief_id: string;
  actor: string;
  generated_at: string;
  window: { start: string; end: string };
  headline: string;
  evidence_bundle_id: string;
  priorities: Array<{
    priority_id: string;
    rank: 1 | 2 | 3;
    title: string;
    recommendation: string;
    why_now: string;
    evidence_for: string[];
    evidence_against: string[];
    confidence: Confidence;
    success_signal: string;
    decision_deadline?: string;
    next_action: ActionIntent;
  }>;
  watchlist: Array<{ signal: string; why_it_matters: string; evidence_refs: string[] }>;
  source_coverage: Array<{
    source: string;
    status: "fresh" | "degraded" | "missing";
    detail: string;
    last_observed_at?: string;
  }>;
  unknowns: string[];
  extensions?: Record<string, unknown>;
}
