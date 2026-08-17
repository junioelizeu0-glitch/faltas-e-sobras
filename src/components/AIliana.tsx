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
      className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-700 text-white shadow-xs"
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
    <div className="flex-1 min-h-screen bg-[#F4F6F5] p-4 md:p-6 flex flex-col font-sans text-slate-800">
      <div className="w-full flex-1 bg-white rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden">
        {/* Header compacto */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar />
            <div className="leading-tight">
              <div className="text-sm font-bold text-slate-900 tracking-tight">
                Assistente Nativo Antigravity AI
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Inteligência Artificial Analítica · Leitura em Tempo Real
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpar Histórico
            </button>
          )}
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 && (
              <div className="mt-8 text-center space-y-4">
                <div className="inline-flex items-center justify-center p-3 bg-emerald-50 rounded-2xl border border-emerald-200/60 shadow-xs">
                  <Sparkles className="w-8 h-8 text-emerald-700" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Como posso ajudar na sua gestão hoje?
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Consulte informações em tempo real sobre chamados, prazos de SLA, transportadoras, lojas e métricas operacionais.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 text-left pt-4 max-w-2xl mx-auto">
                  {SUGESTOES.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 text-slate-700 font-medium transition-all shadow-xs cursor-pointer"
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
                  <div className="rounded-2xl rounded-tr-xs px-4 py-3 max-w-[78%] text-xs font-medium bg-emerald-700 text-white shadow-xs leading-relaxed">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-3 items-start">
                  <Avatar />
                  <div className="flex-1 text-xs leading-relaxed text-slate-800 bg-slate-50 rounded-2xl rounded-tl-xs p-4 border border-slate-200/80 shadow-xs prose prose-slate max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              )
            )}

            {loading && (
              <div className="flex gap-3 items-center">
                <Avatar />
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200/60">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analisando dados da base...</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* Input pill */}
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 rounded-2xl pl-4 pr-2 py-2 border border-slate-200 bg-white shadow-xs focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Pergunte sobre chamados, prazos, transportadoras..."
                className="flex-1 resize-none bg-transparent border-0 outline-none focus:ring-0 px-0 py-1 text-xs font-medium text-slate-800 placeholder-slate-400 max-h-[120px]"
                disabled={loading}
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                aria-label="Enviar"
                className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-40 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-[10px] text-center mt-2 text-slate-400 font-medium">
              Enter envia · Shift+Enter quebra linha
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
