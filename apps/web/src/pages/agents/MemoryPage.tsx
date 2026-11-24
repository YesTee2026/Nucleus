import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { Brain, Clock, Warehouse } from "lucide-react";
import { Link } from "react-router-dom";

export function MemoryPage() {
  const { agentMemories } = useAppStore();

  return (
    <PageShell
      header={
        <Header
          title="Agent Memory"
          description="Postgres-backed learning from authorized staging confirmations"
        />
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <Link to="/agents">
          <Button variant="secondary" size="sm">
            Agents
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
          <Button variant="secondary" size="sm" className="bg-brand-50 text-brand-700 ring-brand-200">
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
                <th className="px-5 py-3">Pattern</th>
                <th className="px-5 py-3">Kind</th>
                <th className="px-5 py-3">Resolved class</th>
                <th className="px-5 py-3">Hits</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Last used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agentMemories.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 font-mono text-xs text-slate-800">{m.pattern}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline">{m.kind}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{m.resolvedClass ?? "—"}</td>
                  <td className="px-5 py-3 tabular-nums">{m.hitCount}</td>
                  <td className="px-5 py-3 text-slate-500">{m.source}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {m.lastUsedAt ? formatRelativeDate(m.lastUsedAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
