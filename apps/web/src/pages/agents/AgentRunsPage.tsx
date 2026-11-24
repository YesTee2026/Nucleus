import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PROVIDER_LABELS } from "@/data/agents-mock";
import { formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { Brain, Clock, Warehouse } from "lucide-react";
import { Link } from "react-router-dom";

export function AgentRunsPage() {
  const { agentRuns } = useAppStore();

  return (
    <PageShell
      header={
        <Header title="Agent Runs" description="Execution history across Claude and Cursor providers" />
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <Link to="/agents">
          <Button variant="secondary" size="sm">
            Agents
          </Button>
        </Link>
        <Link to="/agents/runs">
          <Button variant="secondary" size="sm" className="bg-brand-50 text-brand-700 ring-brand-200">
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

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Provider</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agentRuns.map((run) => (
                <tr key={run.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 text-slate-500">{formatRelativeDate(run.createdAt)}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{run.agentName}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline">{PROVIDER_LABELS[run.provider]}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge
                      className={
                        run.status === "succeeded"
                          ? "bg-emerald-100 text-emerald-800 ring-emerald-300/30"
                          : run.status === "failed"
                            ? "bg-red-100 text-red-800 ring-red-300/30"
                            : "bg-slate-100 text-slate-600"
                      }
                    >
                      {run.status}
                    </Badge>
                  </td>
                  <td className="max-w-md truncate px-5 py-3 text-slate-600">{run.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
