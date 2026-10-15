import ReactMarkdown from "react-markdown";
import { normalizeModelText } from "../lib/plan";

/** Renders model output as markdown. Raw HTML in the text is not rendered. */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {normalizeModelText(text)}
      </ReactMarkdown>
    </div>
  );
}
