import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent, CardHeader, CardTitle } from "@/components/layout/PageShell";
import { CvssBadge, SeverityBadge, TicketStatusBadge } from "@/components/vuln/VulnBadges";
import { formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { Link, useSearchParams } from "react-router-dom";

export function GroupsPage() {
  const { groups, getTicketsForGroup } = useAppStore();
  const [params] = useSearchParams();
  const highlightCve = params.get("cve");

  return (
    <PageShell
      header={
        <Header
          title="CVE Groups"
          description="Each CVE rolls up to one remediation ticket per affected configuration item"
        />
      }
    >
      <div className="grid gap-4">
        {groups.map((group) => {
          const tickets = getTicketsForGroup(group.cveId);
          const openTickets = tickets.filter((t) => !["closed", "verified"].includes(t.status))
            .length;
          const isHighlighted = highlightCve === group.cveId;

          return (
            <Card
              key={group.id}
              className={isHighlighted ? "ring-2 ring-brand-500 ring-offset-2" : undefined}
            >
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/vulnerabilities/groups?cve=${group.cveId}`}
                      className="font-mono text-base font-semibold text-brand-700 hover:underline"
                    >
                      {group.cveId}
                    </Link>
                    <SeverityBadge severity={group.maxSeverity} />
                    <CvssBadge score={group.cvssScore} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{group.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} · {tickets.length} CI
                    {tickets.length !== 1 ? "s" : ""} · one ticket per CI
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold tabular-nums text-slate-900">{openTickets} open</p>
                  <p className="text-xs text-slate-500">
                    Last seen {formatRelativeDate(group.lastSeenAt)}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-slate-100 bg-slate-50/50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5">Configuration Item</th>
                      <th className="px-5 py-2.5">Ticket</th>
                      <th className="px-5 py-2.5">Status</th>
                      <th className="px-5 py-2.5">Assignee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-3">
                          <Link
                            to={`/configuration-items/${t.ciId}`}
                            className="font-medium text-brand-700 hover:underline"
                          >
                            {t.ciName}
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            to={`/vulnerabilities/tickets/${t.id}`}
                            className="font-mono text-xs font-medium text-brand-700 hover:underline"
                          >
                            {t.ticketNumber}
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <TicketStatusBadge status={t.status} />
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
          );
        })}
      </div>
    </PageShell>
  );
}
