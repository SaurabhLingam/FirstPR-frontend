// Minimal stand-in for the FirstPR backend, for working on the UI offline.
// Run: npm run mock   then   VITE_BACKEND_URL=http://localhost:7861 npm run dev
import { createServer } from "node:http";

const PORT = Number(process.env.PORT || 7861);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function repoOf(url) {
  const m = /github\.com\/([\w.-]+\/[\w.-]+)/i.exec(url || "");
  return m ? m[1].replace(/\.git$/, "") : null;
}

createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204);
  if (req.method === "GET" && req.url === "/") return send(res, 200, { ok: true, service: "firstpr-mock" });

  const body = await readJson(req);
  if (req.url === "/init") return send(res, 200, { ok: true, skills: body.skills || [] });

  if (req.url === "/recommend") {
    const repo = repoOf(body.repo_url);
    if (!repo) return send(res, 400, { detail: "Invalid GitHub repository URL" });
    await delay(2500);
    const u = (n) => `https://github.com/${repo}/issues/${n}`;
    return send(res, 200, {
      count: 3,
      message: [
        "Here are the best beginner issues for your skills:",
        "",
        `1) **Fix broken links in the contributing guide** (${u(412)})`,
        "   - Compatibility: 91%",
        "   - Top matched skills: docs, markdown",
        "   - Why: small, self-contained docs fix. First step: open CONTRIBUTING.md.",
        `2) **Add dark-mode styles to the settings modal** (${u(398)})`,
        "   - Compatibility: 78%",
        "   - Top matched skills: css, react",
        `3) **Write unit tests for the date helpers** (${u(365)})`,
        "   - Compatibility: 58%",
        "   - Top matched skills: javascript",
        "",
        "Want help with one? Reply with the issue number or URL.",
      ].join("\n"),
    });
  }

  if (req.url === "/plan") {
    if (!/\/issues\/\d+/.test(body.issue_url || "")) return send(res, 400, { detail: "Invalid GitHub issue URL" });
    await delay(1500);
    return send(res, 200, {
      plan: [
        "Here's a plan for this issue.",
        "",
        "1. **Set up the project**: Fork, clone, and follow README.md until the dev server runs.",
        "2. **Reproduce**: Open the guide and note every link that 404s.",
        "3. **Find the content**: Look in docs/ and CONTRIBUTING.md for the old paths.",
        "4. **Make the fix**: Update each link, keeping relative paths consistent.",
        "5. **Verify**: Re-run the docs preview and click every link you touched.",
        "6. **Open the PR**: Reference the issue and list the links you changed.",
        "",
        "Which step would you like to start with?",
      ].join("\n"),
    });
  }

  if (req.url === "/chat") {
    await delay(1000);
    const last = (body.history || []).filter((m) => m.role === "user").pop();
    return send(res, 200, {
      reply: `Good question about “${(last?.content || "").slice(0, 60)}”. Start by searching the repo for the old path — the same link is often in more than one file.`,
    });
  }

  send(res, 404, { detail: "Not Found" });
}).listen(PORT, () => console.log(`FirstPR mock backend on http://localhost:${PORT}`));
