// ─── Chat ────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  pii_detected: number
  blocked: boolean
  timestamp: Date
}

export interface ChatRequest {
  message: string
  user_id: string
  session_id: string
}

export interface ChatResponse {
  reply: string
  llm_tokens_used: number
  pii_detected: number
}

// ─── Audit ───────────────────────────────────────────────

export interface AuditEvent {
  id: number
  session_id: string
  event_type: "NORMAL" | "PII_DETECTED" | "PROMPT_INJECTION" | "TOXIC_OUTPUT"
  severity: "low" | "medium" | "high" | "critical"
  pii_count: number
  risk_score: number
  latency_ms: number
  blocked: boolean
  created_at: string
}

export interface AuditStats {
  total_events: number
  total_pii_detected: number
  total_blocked: number
  avg_latency_ms: number
  events_by_type: Record<string, number>
}

// ─── Auth ────────────────────────────────────────────────

export interface User {
  email: string
  role: "admin" | "viewer"
}

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

// ─── UI ──────────────────────────────────────────────────

export type Theme = "light" | "dark"
export type Language = "fr" | "en"