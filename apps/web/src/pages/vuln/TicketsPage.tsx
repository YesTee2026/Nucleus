import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent } from "@/components/layout/PageShell";
import { SeverityBadge, SlaIndicator, TicketStatusBadge } from "@/components/vuln/VulnBadges";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { VulnSeverity } from "@/data/vuln-mock";
import { useAppStore } from "@/store/AppStore";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

export function TicketsPage() {
  const { tickets, cis, groups, addTicket } = useAppStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [open, setOpen] = useState(false);
  const [cveId, setCveId] = useState(groups[0]?.cveId ?? "");
  const [ciId, setCiId] = useState(cis[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [sev, setSev] = useState<VulnSeverity>("high");

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        t.ticketNumber.toLowerCase().includes(q) ||
        t.cveId.toLowerCase().includes(q) ||
        t.ciName.toLowerCase().includes(q);
      const matchesStatus = status === "all" || t.status === status;
      const matchesSeverity = severity === "all" || t.severity === severity;
      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [tickets, search, status, severity]);

  return (
    <PageShell
      header={
        <Header
          title="Remediation Tickets"
          description="Actionable vulnerability issues assigned for remediation"
          action={{ label: "New Ticket", onClick: () => setOpen(true) }}
        />
      }
    >
      <Card>
        <CardContent className="border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search ticket, CVE, CI..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </Select>
            <Select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-36">
              <option value="all">All severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
            </Select>
          </div>
        </CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Ticket</th>
                <th className="px-5 py-3">CVE</th>
                <th className="px-5 py-3">CI</th>
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Assignee</th>
                <th className="px-5 py-3">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-brand-50/30">
                  <td className="px-5 py-3">
                    <Link
                      to={`/vulnerabilities/tickets/${t.id}`}
                      className="font-mono text-sm font-medium text-brand-700 hover:underline"
                    >
                      {t.ticketNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">{t.cveId}</td>
                  <td className="px-5 py-3">
                    <Link
                      to={`/configuration-items/${t.ciId}`}
                      className="text-brand-700 hover:underline"
                    >
                      {t.ciName}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <SeverityBadge severity={t.severity} />
                  </td>
                  <td className="px-5 py-3">
                    <TicketStatusBadge status={t.status} />
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {t.assigneeName ?? t.assignedTeam ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <SlaIndicator dueDate={t.dueDate} breached={!!t.slaBreachAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Remediation Ticket"
        description="One ticket per CVE + CI"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!cveId || !ciId || !title.trim()}
              onClick={() => {
                addTicket({ cveId, ciId, title: title.trim(), severity: sev });
                setOpen(false);
                setTitle("");
              }}
            >
              Create Ticket
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">CVE</span>
            <Select value={cveId} onChange={(e) => setCveId(e.target.value)}>
              {groups.map((g) => (
                <option key={g.id} value={g.cveId}>
                  {g.cveId} — {g.title}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Configuration Item</span>
            <Select value={ciId} onChange={(e) => setCiId(e.target.value)}>
              {cis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Title</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Severity</span>
            <Select value={sev} onChange={(e) => setSev(e.target.value as VulnSeverity)}>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </label>
        </div>
      </Modal>
    </PageShell>
  );
}
