import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent, CardHeader, CardTitle } from "@/components/layout/PageShell";
import { CvssBadge, SeverityBadge, TicketStatusBadge } from "@/components/vuln/VulnBadges";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { TicketStatus } from "@/data/vuln-mock";
import { TICKET_STATUS_LABELS } from "@/data/vuln-mock";
import { formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    getTicketById,
    getGroupByCve,
    getFindingsForGroup,
    getTicketsForGroup,
    findings,
    updateTicketStatus,
    assignTicket,
  } = useAppStore();
  const ticket = id ? getTicketById(id) : undefined;

  const [statusOpen, setStatusOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [status, setStatus] = useState<TicketStatus>("in_progress");
  const [assigneeName, setAssigneeName] = useState("");
  const [assignedTeam, setAssignedTeam] = useState("");

  if (!ticket) {
    return (
      <PageShell header={<Header title="Ticket Not Found" />}>
        <Card>
          <CardContent className="py-12 text-center">
            <Link to="/vulnerabilities/tickets">
              <Button variant="secondary">Back to tickets</Button>
            </Link>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const group = getGroupByCve(ticket.cveId);
  const finding = findings.find((f) => f.id === ticket.findingId);
  const relatedFindings = getFindingsForGroup(ticket.cveId);
  const siblingTickets = getTicketsForGroup(ticket.cveId);

  return (
    <PageShell
      header={
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-4 px-6">
            <div className="flex min-w-0 items-center gap-4">
              <Link
                to="/vulnerabilities/tickets"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-mono text-lg font-semibold text-slate-900">
                    {ticket.ticketNumber}
                  </h1>
                  <TicketStatusBadge status={ticket.status} />
                  <SeverityBadge severity={ticket.severity} />
                </div>
                <p className="text-sm text-slate-500">{ticket.title}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAssigneeName(ticket.assigneeName ?? "");
                  setAssignedTeam(ticket.assignedTeam ?? "");
                  setAssignOpen(true);
                }}
              >
                Assign
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setStatus(ticket.status);
                  setStatusOpen(true);
                }}
              >
                Update Status
              </Button>
            </div>
          </div>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Assignee</dt>
                <dd className="mt-1">{ticket.assigneeName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Team</dt>
                <dd className="mt-1">{ticket.assignedTeam ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Due Date</dt>
                <dd className="mt-1">{new Date(ticket.dueDate).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Configuration Item</dt>
                <dd className="mt-1">
                  <Link
                    to={`/configuration-items/${ticket.ciId}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {ticket.ciName}
                  </Link>
                </dd>
              </div>
              {ticket.resolutionNotes && (
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-500">Resolution</dt>
                  <dd className="mt-1 text-slate-700">{ticket.resolutionNotes}</dd>
                </div>
              )}
            </CardContent>
          </Card>

          {group && (
            <Card>
              <CardHeader>
                <CardTitle>CVE Group</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  to={`/vulnerabilities/groups?cve=${group.cveId}`}
                  className="font-mono font-medium text-brand-700 hover:underline"
                >
                  {group.cveId}
                </Link>
                <p className="mt-2 text-sm text-slate-600">{group.title}</p>
                <div className="mt-3 flex gap-2">
                  <CvssBadge score={group.cvssScore} />
                  <span className="text-xs text-slate-500">
                    {siblingTickets.length} ticket{siblingTickets.length !== 1 ? "s" : ""} across{" "}
                    {siblingTickets.length} CI{siblingTickets.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          {finding && (
            <Card>
              <CardHeader>
                <CardTitle>Primary Finding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-slate-700">{finding.description}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {finding.packageName && (
                    <div>
                      <dt className="text-xs text-slate-500">Package</dt>
                      <dd className="font-mono">{finding.packageName}</dd>
                    </div>
                  )}
                  {finding.installedVersion && (
                    <div>
                      <dt className="text-xs text-slate-500">Installed</dt>
                      <dd className="font-mono">{finding.installedVersion}</dd>
                    </div>
                  )}
                  {finding.fixedVersion && (
                    <div>
                      <dt className="text-xs text-slate-500">Fixed in</dt>
                      <dd className="font-mono text-emerald-700">{finding.fixedVersion}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-slate-500">Scanner</dt>
                    <dd>{finding.scannerName}</dd>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Last seen {formatRelativeDate(finding.lastSeenAt)}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>All Tickets for {ticket.cveId}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase text-slate-500">
                    <th className="px-5 py-2">CI</th>
                    <th className="px-5 py-2">Ticket</th>
                    <th className="px-5 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {siblingTickets.map((t) => (
                    <tr key={t.id} className={t.id === ticket.id ? "bg-brand-50/50" : undefined}>
                      <td className="px-5 py-2">{t.ciName}</td>
                      <td className="px-5 py-2">
                        <Link
                          to={`/vulnerabilities/tickets/${t.id}`}
                          className="font-mono text-xs text-brand-700 hover:underline"
                        >
                          {t.ticketNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-2">
                        <TicketStatusBadge status={t.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Findings for {ticket.cveId}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {relatedFindings.map((f) => (
                    <tr key={f.id}>
                      <td className="px-5 py-3">
                        {f.ciName ?? <span className="text-amber-600">Unmatched</span>}
                      </td>
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
      </div>

      <Modal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Update Ticket Status"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateTicketStatus(ticket.id, status);
                setStatusOpen(false);
              }}
            >
              Save Status
            </Button>
          </>
        }
      >
        <Select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)}>
          {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Modal>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign Ticket"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!assigneeName.trim()}
              onClick={() => {
                assignTicket(ticket.id, assigneeName.trim(), assignedTeam.trim() || undefined);
                setAssignOpen(false);
              }}
            >
              Assign
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Assignee</span>
            <Input
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              placeholder="Alex Kim"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Team</span>
            <Input
              value={assignedTeam}
              onChange={(e) => setAssignedTeam(e.target.value)}
              placeholder="Platform Security"
            />
          </label>
        </div>
      </Modal>
    </PageShell>
  );
}
