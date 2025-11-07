"use client";
import { useState } from "react";

type Result = {
  id: string;
  text: string;
  author?: string;
  source?: string;
  year?: number;
  tags?: string;
  is_public_domain?: boolean;
  confidence?: number;
};

export default function Home() {
  const [q, setQ] = useState("");
  const [tone, setTone] = useState("neutral");
  const [pd, setPd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  async function onSearch() {
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, tone, publicDomainOnly: pd }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } finally {
      setLoading(false);
    }
  }

  function whyThisHelps(r: Result) {
    const tags = (r.tags || "").split(",").map((t) => t.trim());
    if (tags.includes("learning"))
      return "Reframes failure as practice and progress.";
    if (tags.includes("resilience"))
      return "Points you back to getting up and trying again.";
    if (tags.includes("discipline"))
      return "Emphasizes steady effort over quick wins.";
    return "Offers perspective without minimizing your feelings.";
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-semibold">Perspective Quotes</h1>
      <p className="mt-2 text-sm text-gray-600">
        Describe what happened, we’ll find quotes that help reframe it.
      </p>

      <div className="mt-4 space-y-3">
        <textarea
          className="w-full border rounded-2xl p-4 focus:outline-none focus:ring-2"
          rows={3}
          placeholder="e.g., I failed my test"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="ml-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pd}
            onChange={(e) => setPd(e.target.checked)}
          />
          Public‑domain only
        </label>
        <button
          onClick={onSearch}
          className="ml-auto rounded-xl px-4 py-2 bg-black text-white disabled:opacity-60"
          disabled={!q.trim() || loading}
        >
          {loading ? "Finding…" : "Get quotes"}
        </button>
      </div>

      <section className="mt-6 space-y-4">
        {results.map((r) => (
          <article key={r.id} className="border rounded-2xl p-4">
            <p className="text-lg leading-relaxed">“{r.text}”</p>
            <div className="mt-2 text-sm text-gray-600">
              — {r.author}
              {r.year ? `, ${r.year}` : ""}
              {r.source ? ` · ${r.source}` : ""}
            </div>
            <div className="mt-2 text-xs italic">{whyThisHelps(r)}</div>
            <div className="mt-3 flex gap-2 flex-wrap items-center">
              {(r.tags || "")
                .split(",")
                .slice(0, 4)
                .map((t) => (
                  <span
                    key={t}
                    className="text-xs border rounded-full px-2 py-0.5"
                  >
                    {t}
                  </span>
                ))}
              {r.confidence === 0 && (
                <span
                  className="ml-auto text-xs text-amber-700"
                  title="Attribution disputed"
                >
                  ⚠️ verify attribution
                </span>
              )}
              <button
                className="ml-auto text-xs underline"
                onClick={() =>
                  navigator.clipboard.writeText(`"${r.text}" — ${r.author}`)
                }
              >
                Copy
              </button>
            </div>
          </article>
        ))}

        {!results.length && (
          <div className="text-sm text-gray-500">
            Try: “I messed up at work”, “I’m scared to start”, “I failed my
            driving test”.
          </div>
        )}
      </section>
    </main>
  );
}
