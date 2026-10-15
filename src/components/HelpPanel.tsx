import { XIcon } from "./Icons";

const FAQS = [
  {
    q: "What is a “good first issue”?",
    a: "A small, well-described task that maintainers have marked as suitable for newcomers. FirstPR looks for these labels first.",
  },
  {
    q: "What does the fit percentage mean?",
    a: "How closely an issue's text matches your skills. 80%+ is a strong fit; under 65% is a stretch you can still try.",
  },
  {
    q: "Will FirstPR write the code for me?",
    a: "No. It gives you a plan and answers questions, so you learn the codebase and the change is genuinely yours.",
  },
  {
    q: "Do I need a GitHub account?",
    a: "Not to browse here. You'll need a free one to fork the repo and open your pull request.",
  },
  {
    q: "How do I open a pull request?",
    a: "Fork the repo, push your changes to a branch on your fork, then click “Compare & pull request” on GitHub.",
  },
  {
    q: "Keyboard shortcuts",
    a: "Enter adds a skill or sends a message. Shift+Enter adds a new line. Backspace in an empty skill box removes the last skill.",
  },
];

export function HelpPanel({ onClose, onReplayTips }: { onClose: () => void; onReplayTips: () => void }) {
  return (
    <section aria-label="Help" className="box" style={{ marginBottom: 24 }}>
      <div className="box-header lg">
        <h2 style={{ fontSize: 14, flex: 1 }}>Help &amp; FAQ</h2>
        <button type="button" className="btn btn-sm" onClick={onReplayTips}>
          Show tips again
        </button>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close help">
          <XIcon />
        </button>
      </div>
      <div className="faq">
        {FAQS.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p className="muted">{f.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
