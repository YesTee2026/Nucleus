import { Header } from "@/components/layout/Header";
import { PageShell, SectionHeader, StatCard, Card, CardContent, CardHeader, CardTitle } from "@/components/layout/PageShell";
import { SeverityBadge, StatusBadge } from "@/components/ui/Badge";
import { SeverityBadge as VulnSeverityBadge } from "@/components/vuln/VulnBadges";
import type { VulnSeverity } from "@/data/vuln-mock";
import { formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import {
  AlertTriangle,
  Boxes,
  GitBranch,
  Radar,
  Shapes,
  Shield,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

export function DashboardPage() {
  const { cis, conflicts, classes, dashboardStats, vulnStats } = useAppStore();
  const stats = dashboardStats();
  const vStats = vulnStats();
  const recentCis = [...cis]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <PageShell
      header={
        <Header
          title="Dashboard"
          description="Configuration management overview and health metrics"
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total CIs"
          value={stats.totalCis}
          change={`+${stats.discoveredToday} discovered today`}
          changeType="positive"
          icon={Boxes}
        />
        <StatCard
          title="Active CIs"
          value={stats.activeCis}
          change={`${cis.length} in local workspace`}
          changeType="neutral"
          icon={TrendingUp}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Relationships"
          value={stats.relationships.toLocaleString()}
          change="Across all classes"
          changeType="neutral"
          icon={GitBranch}
          iconColor="bg-violet-50 text-violet-600"
        />
        <StatCard
          title="Open Conflicts"
          value={stats.openConflicts}
          change="Requires review"
          changeType="negative"
          icon={AlertTriangle}
          iconColor="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recently Updated CIs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Class</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCis.map((ci) => (
                  <tr key={ci.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3">
                      <Link
                        to={`/configuration-items/${ci.id}`}
                        className="font-medium text-brand-700 hover:text-brand-800 hover:underline"
                      >
                        {ci.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{ci.className}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={ci.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatRelativeDate(ci.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Conflicts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {conflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="rounded-lg border border-slate-100 bg-slate-50/50 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <SeverityBadge severity={conflict.severity} />
                  <span className="text-xs text-slate-500">
                    {conflict.conflictType.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-800">{conflict.activityA}</p>
                <p className="mt-1 text-xs text-slate-500">vs {conflict.activityB}</p>
                <p className="mt-2 text-xs text-slate-600">
                  Shared CI: <span className="font-medium">{conflict.sharedCiName}</span>
                </p>
              </div>
            ))}
            <Link
              to="/activities"
              className="block text-center text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              View all activities →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <SectionHeader
          title="Vulnerability Remediation"
          description="Open tickets and top CVE groups from scanner integrations"
          action={
            <Link
              to="/vulnerabilities"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              View module →
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Open Vuln Tickets"
            value={vStats.openTickets}
            change={`${vStats.slaBreached} SLA breached`}
            changeType="negative"
            icon={Shield}
            iconColor="bg-red-50 text-red-600"
          />
          <StatCard
            title="Active Findings"
            value={vStats.activeFindings}
            change={`${vStats.bySeverity.critical} critical`}
            changeType="negative"
            icon={AlertTriangle}
            iconColor="bg-orange-50 text-orange-600"
          />
          <StatCard
            title="SLA At Risk"
            value={vStats.slaAtRisk}
            change="Due within 3 days"
            changeType="negative"
            icon={Shield}
            iconColor="bg-amber-50 text-amber-600"
          />
          <Card>
            <CardHeader>
              <CardTitle>Top CVE</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {vStats.topCves.slice(0, 3).map((cve) => (
                <div key={cve.cveId} className="flex items-center justify-between text-sm">
                  <Link
                    to={`/vulnerabilities/groups?cve=${cve.cveId}`}
                    className="font-mono text-xs font-medium text-brand-700 hover:underline"
                  >
                    {cve.cveId}
                  </Link>
                  <VulnSeverityBadge severity={cve.severity as VulnSeverity} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <SectionHeader title="Quick Actions" description="Common CMDB operations" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              to: "/configuration-items",
              icon: Boxes,
              label: "Browse CIs",
              desc: `${cis.length} configuration items`,
            },
            {
              to: "/classes",
              icon: Shapes,
              label: "Manage Classes",
              desc: `${classes.length} CI classes defined`,
            },
            { to: "/discovery", icon: Radar, label: "Run Discovery", desc: "Network scan & scripts" },
          ].map((item) => (
            <Link key={item.to} to={item.to}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{item.label}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
