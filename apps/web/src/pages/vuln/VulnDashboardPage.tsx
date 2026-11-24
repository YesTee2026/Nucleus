import { Header } from "@/components/layout/Header";
import { PageShell, StatCard, Card, CardContent, CardHeader, CardTitle, SectionHeader } from "@/components/layout/PageShell";
import { SeverityBadge } from "@/components/vuln/VulnBadges";
import type { VulnSeverity } from "@/data/vuln-mock";
import { useAppStore } from "@/store/AppStore";
import { AlertTriangle, Bug, Shield, Ticket } from "lucide-react";
import { Link } from "react-router-dom";

export function VulnDashboardPage() {
  const { tickets, scanners, rules, vulnStats } = useAppStore();
  const stats = vulnStats();
  const recentTickets = tickets
    .filter((t) => !["closed", "verified"].includes(t.status))
    .slice(0, 5);

  return (
    <PageShell
      header={
        <Header
          title="Vulnerability Remediation"
          description="Scanner findings, CVE groups, and remediation tickets"
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Open Tickets"
          value={stats.openTickets}
          change={`${stats.slaBreached} SLA breached`}
          changeType={stats.slaBreached > 0 ? "negative" : "neutral"}
          icon={Ticket}
          iconColor="bg-red-50 text-red-600"
        />
        <StatCard
          title="Active Findings"
          value={stats.activeFindings}
          change="Across all scanners"
          changeType="neutral"
          icon={Bug}
          iconColor="bg-orange-50 text-orange-600"
        />
        <StatCard
          title="Critical / High"
          value={stats.bySeverity.critical + stats.bySeverity.high}
          change={`${stats.bySeverity.critical} critical`}
          changeType="negative"
          icon={AlertTriangle}
          iconColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="SLA At Risk"
          value={stats.slaAtRisk}
          change="Due within 3 days"
          changeType="negative"
          icon={Shield}
          iconColor="bg-violet-50 text-violet-600"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top CVE Groups</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">CVE</th>
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Severity</th>
                  <th className="px-5 py-3">Affected CIs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.topCves.map((cve) => (
                  <tr key={cve.cveId} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3">
                      <Link
                        to={`/vulnerabilities/groups?cve=${cve.cveId}`}
                        className="font-mono text-sm font-medium text-brand-700 hover:underline"
                      >
                        {cve.cveId}
                      </Link>
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 text-slate-600">{cve.title}</td>
                    <td className="px-5 py-3">
                      <SeverityBadge severity={cve.severity as VulnSeverity} />
                    </td>
                    <td className="px-5 py-3 tabular-nums text-slate-600">{cve.affectedCiCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scanner Sync Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scanners
              .filter((s) => s.enabled)
              .map((sync) => (
                <div
                  key={sync.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2"
                >
                  <span className="text-sm text-slate-700">{sync.name}</span>
                  <span
                    className={`text-xs font-medium capitalize ${
                      sync.lastSyncStatus === "success"
                        ? "text-emerald-600"
                        : sync.lastSyncStatus === "failed"
                          ? "text-red-600"
                          : "text-slate-500"
                    }`}
                  >
                    {sync.lastSyncStatus}
                  </span>
                </div>
              ))}
            <Link
              to="/vulnerabilities/scanners"
              className="block text-center text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Manage scanners →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <SectionHeader title="Recent Open Tickets" />
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Ticket</th>
                  <th className="px-5 py-3">CI</th>
                  <th className="px-5 py-3">CVE</th>
                  <th className="px-5 py-3">Severity</th>
                  <th className="px-5 py-3">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3">
                      <Link
                        to={`/vulnerabilities/tickets/${t.id}`}
                        className="font-mono text-sm font-medium text-brand-700 hover:underline"
                      >
                        {t.ticketNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{t.ciName}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{t.cveId}</td>
                    <td className="px-5 py-3">
                      <SeverityBadge severity={t.severity} />
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {t.assigneeName ?? t.assignedTeam ?? "Unassigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <SectionHeader title="Quick Links" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { to: "/vulnerabilities/findings", label: "Findings", count: stats.activeFindings },
            { to: "/vulnerabilities/groups", label: "CVE Groups", count: stats.topCves.length },
            { to: "/vulnerabilities/tickets", label: "Tickets", count: stats.openTickets },
            { to: "/vulnerabilities/rules", label: "Assignment Rules", count: rules.length },
          ].map((item) => (
            <Link key={item.to} to={item.to}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">{item.count}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
