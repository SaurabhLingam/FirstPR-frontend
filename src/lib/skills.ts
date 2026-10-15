// Copy of backend/skill_map.json, so the UI can show what each skill expands to.
// Keep it in sync when the backend's map changes.
import skillMap from "../data/skill_map.json";

const MAP = skillMap as Record<string, string[]>;

const ALIASES: Record<string, string> = {
  javascript: "js",
  "node.js": "js",
  node: "js",
  "react.js": "react",
  reactjs: "react",
  "next.js": "nextjs",
  postgres: "sql",
  postgresql: "sql",
  mysql: "sql",
  "web dev": "web_dev",
  "web development": "web_dev",
};

export function normalizeSkill(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Related terms the backend matches for this skill (empty when the map doesn't know it). */
export function expandSkill(skill: string): string[] {
  const norm = normalizeSkill(skill);
  const terms = MAP[norm] ?? MAP[ALIASES[norm] ?? ""] ?? [];
  const seen = new Set([norm]);
  return terms.filter((t) => {
    const k = t.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const SUGGESTED_SKILLS = ["python", "javascript", "react", "html", "css", "docker", "sql", "api", "typescript"];
