import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent } from "@/components/layout/PageShell";
import { CvssBadge, SeverityBadge } from "@/components/vuln/VulnBadges";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

export function FindingsPage() {
  const { findings } = useAppStore();
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    return findings.filter((f) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        f.cveId.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        (f.ciName?.toLowerCase().includes(q) ?? false);
      const matchesSeverity = severity === "all" || f.severity === severity;
      const matchesStatus = status === "all" || f.status === status;
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [findings, search, severity, status]);

  return (
    <PageShell
      header={
        <Header
          title="Vulnerability Findings"
          description="Raw normalized findings from all scanner connections"
        />
      }
    >
      <Card>
        <CardContent className="border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search CVE, title, CI..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-36">
              <option value="all">All severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-36">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="remediated">Remediated</option>
              <option value="false_positive">False Positive</option>
            </Select>
          </div>
        </CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">CVE</th>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">CI</th>
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">CVSS</th>
                <th className="px-5 py-3">Scanner</th>
                <th className="px-5 py-3">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 font-mono text-xs font-medium text-brand-700">{f.cveId}</td>
                  <td className="max-w-xs truncate px-5 py-3 text-slate-700">{f.title}</td>
                  <td className="px-5 py-3">
                    {f.ciId ? (
                      <Link
                        to={`/configuration-items/${f.ciId}`}
                        className="text-brand-700 hover:underline"
                      >
                        {f.ciName}
                      </Link>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20">Unmatched</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <SeverityBadge severity={f.severity} />
                  </td>
                  <td className="px-5 py-3">
                    <CvssBadge score={f.cvssScore} />
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{f.scannerName}</td>
                  <td className="px-5 py-3 text-slate-500">{formatRelativeDate(f.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Showing {filtered.length} of {findings.length} findings
        </div>
      </Card>
    </PageShell>
  );
}
