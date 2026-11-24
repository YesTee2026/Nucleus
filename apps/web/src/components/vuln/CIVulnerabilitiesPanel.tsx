import { Card, CardContent, CardHeader, CardTitle } from "@/components/layout/PageShell";
import { SeverityBadge, TicketStatusBadge } from "@/components/vuln/VulnBadges";
import type { VulnSeverity } from "@/data/vuln-mock";
import { useAppStore } from "@/store/AppStore";
import { Link } from "react-router-dom";

interface CIVulnerabilitiesPanelProps {
  ciId: string;
}

export function CIVulnerabilitiesPanel({ ciId }: CIVulnerabilitiesPanelProps) {
  const { getFindingsForCi, getTicketsForCi } = useAppStore();
  const findings = getFindingsForCi(ciId);
  const tickets = getTicketsForCi(ciId);

  const bySeverity = findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    },
    {} as Partial<Record<VulnSeverity, number>>,
  );

  if (findings.length === 0 && tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-slate-500">
          No vulnerabilities found for this configuration item.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {(["critical", "high", "medium", "low"] as VulnSeverity[]).map((sev) => (
          <Card key={sev}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold tabular-nums text-slate-900">
                {bySeverity[sev] ?? 0}
              </p>
              <div className="mt-1 flex justify-center">
                <SeverityBadge severity={sev} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open Remediation Tickets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tickets.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">No tickets</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase text-slate-500">
                  <th className="px-5 py-3">Ticket</th>
                  <th className="px-5 py-3">CVE</th>
                  <th className="px-5 py-3">Severity</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="px-5 py-3">
                      <Link
                        to={`/vulnerabilities/tickets/${t.id}`}
                        className="font-mono text-brand-700 hover:underline"
                      >
                        {t.ticketNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{t.cveId}</td>
                    <td className="px-5 py-3">
                      <SeverityBadge severity={t.severity} />
                    </td>
                    <td className="px-5 py-3">
                      <TicketStatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {findings.map((f) => (
                <tr key={f.id}>
                  <td className="px-5 py-3 font-mono text-xs">{f.cveId}</td>
                  <td className="px-5 py-3 text-slate-700">{f.title}</td>
                  <td className="px-5 py-3">
                    <SeverityBadge severity={f.severity} />
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{f.scannerName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
