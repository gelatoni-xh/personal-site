import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { createHeadingId } from "@/lib/content/markdown";
import "highlight.js/styles/github.css";

interface MarkdownBodyProps {
  content: string;
  className?: string;
}

export function MarkdownBody({ content, className }: MarkdownBodyProps) {
  const headingCounts = new Map<string, number>();

  return (
    <div className={className}>
      <ReactMarkdown
        className="prose prose-stone max-w-none prose-a:text-accent prose-pre:m-0 prose-pre:overflow-x-auto prose-pre:rounded-none prose-pre:border-0 prose-pre:bg-transparent prose-pre:p-0 prose-code:before:content-none prose-code:after:content-none"
        components={{
          h2({ children, ...props }) {
            const text = String(children);
            const id = createHeadingId(text, headingCounts);

            return (
              <h2 id={id} {...props}>
                {children}
              </h2>
            );
          },
          h3({ children, ...props }) {
            const text = String(children);
            const id = createHeadingId(text, headingCounts);

            return (
              <h3 id={id} {...props}>
                {children}
              </h3>
            );
          },
          code({ className: codeClassName, children, ...props }) {
            const isBlock = codeClassName?.includes("language-");

            if (!isBlock) {
              return (
                <code className="rounded border border-line bg-stone-100 px-1.5 py-0.5 font-mono text-[0.9em] text-ink" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <code className={`${codeClassName ?? ""} block min-w-full bg-transparent p-0 font-mono text-[13px] leading-6 text-stone-800`} {...props}>
                {children}
              </code>
            );
          },
          pre({ children }) {
            return (
              <pre className="my-6 overflow-x-auto border border-line bg-stone-50 px-4 py-3 text-sm leading-6 shadow-sm">
                {children}
              </pre>
            );
          },
        }}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
