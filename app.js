const BACKEND = "https://confusedguy-firstpr-backend.hf.space";

const $ = (s) => document.querySelector(s);
const chat = $("#chat");
const repoInput = $("#repo");
const skillsInput = $("#skills");
const form = $("#controls");
const msgBox = $("#msg");
const sendBtn = $("#sendBtn");

const state = {
  repoUrl: "",
  skills: [],
  activeIssueUrl: "",
  messages: []
};

restore();

function renderMarkdown(mdText) {
  marked.setOptions({
    breaks: true,
    gfm: true,
    smartLists: true,
    smartypants: false
  });
  const html = marked.parse(mdText || "");
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

function addMessage(role, content) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  const wrap = document.createElement("div");
  wrap.className = "markdown";
  wrap.innerHTML = renderMarkdown(String(content ?? ""));
  el.appendChild(wrap);
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  state.messages.push({ role, content });
  persist();
  el.querySelectorAll("a").forEach(a => {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  });
}

function setTyping(on) {
  let el = chat.querySelector(".msg.typing-holder");
  if (on) {
    if (!el) {
      el = document.createElement("div");
      el.className = "msg assistant typing-holder";
      el.innerHTML = `<span class="typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>`;
      chat.appendChild(el);
      chat.scrollTop = chat.scrollHeight;
    }
  } else if (el) {
    el.remove();
  }
}

function autoSizeTextarea() {
  msgBox.style.height = "auto";
  msgBox.style.height = Math.min(160, msgBox.scrollHeight) + "px";
}

async function api(path, payload) {
  const r = await fetch(`${BACKEND}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) {
    const msg = (data && (data.detail || data.message)) || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return data;
}

function parseChoice(text) {
  const urlMatch = text.match(/https?:\/\/\S+/);
  if (urlMatch) return { type: "url", value: urlMatch[0].replace(/[).,]$/, "") };
  const n = text.toLowerCase().match(/(?:issue\s*)?(\d+)/);
  if (n) return { type: "index", value: parseInt(n[1], 10) };
  return null;
}

form.addEventListener("submit", onSubmit);
sendBtn.addEventListener("click", send);
msgBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
});
msgBox.addEventListener("input", autoSizeTextarea);
autoSizeTextarea();

async function onSubmit(e) {
  e.preventDefault();
  const repoUrl = repoInput.value.trim();
  const skills = skillsInput.value.split(",").map(s => s.trim()).filter(Boolean);
  state.repoUrl = repoUrl;
  state.skills = skills;
  state.activeIssueUrl = "";
  persist();
  if (!repoUrl || !skills.length) {
    addMessage("assistant", "Please enter a repository URL and at least one skill.");
    return;
  }
  setTyping(true);
  try {
    await api("/init", { skills });
    const res = await api("/recommend", { repo_url: repoUrl, max_issues: 15 });
    setTyping(false);
    const msg = res.message || "No suitable issues found.";
    addMessage("assistant", msg);
    addMessage("assistant", "Paste an issue URL and I’ll guide you step‑by‑step (no code).");
  } catch (err) {
    setTyping(false);
    addMessage("assistant", `Error: ${err.message}`);
  }
}

async function send() {
  const text = msgBox.value.trim();
  if (!text) return;
  msgBox.value = "";
  autoSizeTextarea();
  addMessage("user", text);
  if (!state.repoUrl) {
    addMessage("assistant", "First load a repository and your skills above, then paste the issue URL.");
    return;
  }
  const m = text.match(/https?:\/\/\S+/);
  const url = m ? m[0].replace(/[).,]$/, "") : null;
  if (url) {
    setTyping(true);
    try {
      const res = await api("/plan", { repo_url: state.repoUrl, issue_url: url, constraints: "" });
      setTyping(false);
      addMessage("assistant", res.plan || "I couldn’t create a plan. Try another issue.");
      state.activeIssueUrl = url;
      persist();
    } catch (err) {
      setTyping(false);
      addMessage("assistant", `Error: ${err.message}`);
    }
    return;
  }
  if (state.activeIssueUrl) {
    setTyping(true);
    try {
      const res = await api("/chat", {
        repo_url: state.repoUrl,
        issue_url: state.activeIssueUrl,
        history: state.messages.slice(-12)
      });
      setTyping(false);
      addMessage("assistant", res.reply || "No reply.");
    } catch (err) {
      setTyping(false);
      addMessage("assistant", `Error: ${err.message}`);
    }
    return;
  }
  addMessage("assistant", "Please paste the exact GitHub issue URL you want to work on.");
}

function persist() {
  sessionStorage.setItem("firstpr_state", JSON.stringify(state));
}
function restore() {
  const raw = sessionStorage.getItem("firstpr_state");
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    state.repoUrl = s.repoUrl || "";
    state.skills = s.skills || [];
    state.messages = Array.isArray(s.messages) ? s.messages : [];
    state.activeIssueUrl = s.activeIssueUrl || "";
    $("#repo").value = state.repoUrl;
    $("#skills").value = state.skills.join(", ");
    state.messages.forEach(m => addMessage(m.role, m.content));
  } catch {}
}
