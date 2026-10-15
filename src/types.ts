export type Role = "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface Issue {
  number: number;
  url: string;
  /** owner/name of the repo the issue lives in */
  repo: string;
  title: string;
  labels: string[];
  /** 0..1, or null when the backend didn't give one */
  fit: number | null;
  matched: string[];
}

export interface PlanStep {
  title: string;
  detail: string;
}

export interface ParsedPlan {
  raw: string;
  intro: string;
  steps: PlanStep[];
  outro: string;
}

export interface IssueSession {
  issue: Issue;
  plan: ParsedPlan | null;
  done: boolean[];
  messages: ChatMessage[];
}

export type Stage = "setup" | "scanning" | "issues" | "plan";

export type BackendStatus = "checking" | "online" | "waking" | "offline";
