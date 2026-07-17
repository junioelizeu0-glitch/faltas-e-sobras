import React, { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUp, Loader2, Sparkles, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { askAiiliana } from "@/lib/aiiliana.functions";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGESTOES = [
  "Quantos chamados estão em aberto hoje?",
  "Top 5 transportadoras com mais faltas neste mês",
  "Chamados vencidos por CD",
  "Total em R$ dos chamados aprovados no mês atual",
];

function Avatar() {
  return (
    <div
      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 60%, #7c3aed))",
        color: "var(--accent-text-on)",
        boxShadow: "var(--shadow-c)",
      }}
      aria-hidden
    >
      <Sparkles className="w-4 h-4" />
    </div>
  );
}

export default function AIliana() {
  const ask = useServerFn(askAiiliana);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [input]);

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.text || "(sem resposta)" }]);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível consultar a IA");
      setMessages(next);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div
      className="flex flex-col h-full max-h-[calc(100vh-48px)]"
      style={{ background: "var(--bg-page)" }}
    >
      {/* Header compacto */}
      <div
        className="px-4 py-2.5 border-b flex items-center justify-between"
        style={{ borderColor: "var(--border-c)", background: "var(--bg-card)" }}
      >
        <div className="flex items-center gap-2.5">
          <Avatar />
          <div className="leading-tight">
            <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              AIliana
            </div>
            <div className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              IA analítica · somente leitura
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="inline-flex items-center gap-1 text-xs hover:opacity-80"
            style={{ color: "var(--text-secondary)" }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Limpar
          </button>
        )}
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center justify-center mb-3">
                <Avatar />
              </div>
              <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Como posso ajudar?
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                Pergunte sobre chamados, indicadores, transportadoras, lojas, SLA…
              </p>
              <div className="grid sm:grid-cols-2 gap-2 text-left">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-sm px-3.5 py-2.5 rounded-xl border hover:opacity-90 transition"
                    style={{
                      borderColor: "var(--border-c)",
                      background: "var(--bg-card)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div
                  className="rounded-2xl rounded-br-md px-3.5 py-2 max-w-[78%] text-sm whitespace-pre-wrap"
                  style={{
                    background: "var(--info-bg)",
                    color: "var(--text-primary)",
                  }}
                >
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-3 items-start">
                <Avatar />
                <div
                  className="flex-1 text-sm leading-relaxed prose prose-sm max-w-none
                             prose-headings:mt-3 prose-headings:mb-2
                             prose-p:my-2 prose-ul:my-2 prose-ol:my-2
                             prose-table:my-3 prose-th:px-2 prose-td:px-2
                             prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                             ai-response"
                  style={{ color: "var(--text-primary)" }}
                >
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="flex gap-3 items-center">
              <Avatar />
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Pensando…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input pill */}
      <div className="px-4 pb-4 pt-2" style={{ background: "var(--bg-page)" }}>
        <div className="max-w-3xl mx-auto">
          <div
            className="flex items-end gap-2 rounded-full pl-4 pr-1.5 py-1.5 border shadow-sm"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border-c)",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Pergunte alguma coisa…"
              className="flex-1 resize-none bg-transparent border-0 outline-none focus:ring-0 px-0 py-2 text-sm max-h-[180px]"
              style={{ color: "var(--text-primary)" }}
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition disabled:opacity-40"
              style={{
                background: "var(--accent)",
                color: "var(--accent-text-on)",
              }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-[11px] text-center mt-2" style={{ color: "var(--text-secondary)" }}>
            Enter envia · Shift+Enter quebra linha
          </div>
        </div>
      </div>
    </div>
  );
}
