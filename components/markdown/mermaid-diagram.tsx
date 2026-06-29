"use client";

import { useEffect, useId, useState } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  chart: string;
}

let mermaidInitialized = false;

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const id = useId();
  const [svg, setSvg] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function renderChart() {
      try {
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "neutral",
            securityLevel: "loose",
          });
          mermaidInitialized = true;
        }

        const { svg: renderedSvg } = await mermaid.render(`mermaid-${id.replace(/:/g, "-")}`, chart);

        if (isMounted) {
          setSvg(renderedSvg);
          setHasError(false);
        }
      } catch (error) {
        console.error("Failed to render mermaid chart", error);

        if (isMounted) {
          setSvg(null);
          setHasError(true);
        }
      }
    }

    void renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, id]);

  if (hasError || !svg) {
    return (
      <pre className="my-6 overflow-x-auto border border-line bg-stone-50 px-4 py-3 text-sm leading-6 shadow-sm">
        <code className="block min-w-full bg-transparent p-0 font-mono text-[13px] leading-6 text-stone-800">
          {chart}
        </code>
      </pre>
    );
  }

  return (
    <div className="my-6 overflow-x-auto border border-line bg-white px-4 py-4 shadow-sm">
      <div className="mermaid-diagram min-w-[640px]" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
