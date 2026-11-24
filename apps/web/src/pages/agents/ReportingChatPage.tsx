import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { REPORT_SUGGESTIONS } from "@/data/agents-mock";
import { formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import {
  Bot,
  Brain,
  CalendarClock,
  Clock,
  FileBarChart2,
  MessageSquarePlus,
  Send,
  Trash2,
  Warehouse,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

function ReportMarkdown({ content }: { content: string }) {
  const blocks = content.split("\n");
  return (
    <div className="space-y-1 text-sm leading-relaxed text-slate-700">
      {blocks.map((line, i) => {
        if (line.startsWith("# ")) {
          return (
            <h2 key={i} className="pt-1 text-base font-semibold text-slate-900">
              {line.slice(2)}
            </h2>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className="pt-2 text-sm font-semibold text-slate-800">
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h4 key={i} className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {line.slice(4)}
            </h4>
          );
        }
        if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
          return (
            <p key={i} className="text-xs italic text-slate-500">
              {line.replace(/^\*|\*$/g, "")}
            </p>
          );
        }
        if (line.startsWith("• ") || /^\d+\.\s/.test(line)) {
          const html = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
          return (
            <p key={i} className="pl-1" dangerouslySetInnerHTML={{ __html: html }} />
          );
        }
        if (!line.trim()) return <div key={i} className="h-1.5" />;
        const html = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

export function ReportingChatPage() {
  const {
    reportThreads,
    activeReportThreadId,
    createReportThread,
    setActiveReportThread,
    sendReportMessage,
    deleteReportThread,
    agents,
  } = useAppStore();
  const reporting = agents.find((a) => a.kind === "reporting");
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const active =
    reportThreads.find((t) => t.id === activeReportThreadId) ?? reportThreads[0] ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length, active?.id]);

  const submit = () => {
    if (!draft.trim()) return;
    sendReportMessage(draft, active?.id);
    setDraft("");
  };

  return (
    <PageShell
      header={
        <Header
          title="Reporting Agent"
          description="Chat to create business and management reports from live CMDB, discovery, and risk data"
        />
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <Link to="/agents">
          <Button variant="secondary" size="sm">
            <Bot className="h-3.5 w-3.5" />
            Agents
          </Button>
        </Link>
        <Link to="/agents/reporting">
          <Button variant="secondary" size="sm" className="bg-brand-50 text-brand-700 ring-brand-200">
            <FileBarChart2 className="h-3.5 w-3.5" />
            Reporting
          </Button>
        </Link>
        <Link to="/agents/schedules">
          <Button variant="secondary" size="sm">
            <CalendarClock className="h-3.5 w-3.5" />
            Schedules
          </Button>
        </Link>
        <Link to="/agents/runs">
          <Button variant="secondary" size="sm">
            <Clock className="h-3.5 w-3.5" />
            Runs
          </Button>
        </Link>
        <Link to="/agents/staging">
          <Button variant="secondary" size="sm">
            <Warehouse className="h-3.5 w-3.5" />
            Staging
          </Button>
        </Link>
        <Link to="/agents/memory">
          <Button variant="secondary" size="sm">
            <Brain className="h-3.5 w-3.5" />
            Memory
          </Button>
        </Link>
      </div>

      {reporting && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Badge variant="brand">Reporting</Badge>
          <Badge variant="outline">{reporting.provider}</Badge>
          <span>
            {reporting.enabled ? "Ready" : "Disabled"} · last run{" "}
            {reporting.lastRunAt ? formatRelativeDate(reporting.lastRunAt) : "never"}
          </span>
        </div>
      )}

      <div className="grid min-h-[560px] gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="flex flex-col">
          <CardContent className="flex flex-1 flex-col p-0">
            <div className="border-b border-slate-100 p-3">
              <Button
                size="sm"
                className="w-full"
                onClick={() => createReportThread()}
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                New chat
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {reportThreads.length === 0 && (
                <p className="p-4 text-center text-xs text-slate-500">
                  No chats yet. Start one to generate a management report.
                </p>
              )}
              {reportThreads.map((t) => {
                const selected = t.id === (active?.id ?? "");
                return (
                  <div
                    key={t.id}
                    className={`flex items-start gap-1 border-b border-slate-50 px-2 py-2 ${
                      selected ? "bg-brand-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 px-1 text-left"
                      onClick={() => setActiveReportThread(t.id)}
                    >
                      <p className="truncate text-sm font-medium text-slate-900">{t.title}</p>
                      <p className="text-xs text-slate-400">{formatRelativeDate(t.updatedAt)}</p>
                    </button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => deleteReportThread(t.id)}
                      aria-label="Delete chat"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-[560px] flex-col">
          <CardContent className="flex flex-1 flex-col p-0">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {!active && (
                <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <FileBarChart2 className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Business & management reports</p>
                    <p className="mt-1 max-w-md text-sm text-slate-500">
                      Ask in plain language. The agent uses current CMDB, discovery, staging, and
                      vulnerability figures.
                    </p>
                  </div>
                  <div className="flex max-w-lg flex-wrap justify-center gap-2">
                    {REPORT_SUGGESTIONS.map((s) => (
                      <Button
                        key={s}
                        variant="secondary"
                        size="sm"
                        onClick={() => sendReportMessage(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {active?.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                      m.role === "user"
                        ? "bg-brand-600 text-white"
                        : "border border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    {m.role === "assistant" && m.reportTitle && (
                      <div className="mb-2 flex items-center gap-2">
                        <FileBarChart2 className="h-3.5 w-3.5 text-brand-600" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                          {m.reportTitle}
                        </span>
                      </div>
                    )}
                    {m.role === "assistant" ? (
                      <ReportMarkdown content={m.content} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    )}
                    <p
                      className={`mt-2 text-[10px] ${
                        m.role === "user" ? "text-brand-100" : "text-slate-400"
                      }`}
                    >
                      {formatRelativeDate(m.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {active && active.messages.length <= 1 && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
                {REPORT_SUGGESTIONS.slice(0, 3).map((s) => (
                  <Button
                    key={s}
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      sendReportMessage(s, active.id);
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}

            <div className="border-t border-slate-100 p-4">
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="e.g. Executive CMDB health summary for leadership this week"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                />
                <Button className="shrink-0 self-end" onClick={submit} disabled={!draft.trim()}>
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Enter to send · Shift+Enter for newline · Reports use live mock CMDB metrics
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
