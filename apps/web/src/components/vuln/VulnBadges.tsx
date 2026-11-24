import { cn } from "@/lib/utils";
import { VulnSeverity, TicketStatus } from "@/data/vuln-mock";

const severityStyles: Record<VulnSeverity, string> = {
  critical: "bg-red-50 text-red-700 ring-red-600/20",
  high: "bg-orange-50 text-orange-700 ring-orange-600/20",
  medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  low: "bg-sky-50 text-sky-700 ring-sky-600/20",
  info: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const ticketStatusStyles: Record<TicketStatus, string> = {
  open: "bg-slate-100 text-slate-700 ring-slate-500/20",
  assigned: "bg-blue-50 text-blue-700 ring-blue-600/20",
  in_progress: "bg-violet-50 text-violet-700 ring-violet-600/20",
  resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  verified: "bg-teal-50 text-teal-700 ring-teal-600/20",
  closed: "bg-slate-100 text-slate-500 ring-slate-400/20",
  exception: "bg-amber-50 text-amber-700 ring-amber-600/20",
  risk_accepted: "bg-orange-50 text-orange-700 ring-orange-600/20",
};

export function SeverityBadge({ severity }: { severity: VulnSeverity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset",
        severityStyles[severity],
      )}
    >
      {severity}
    </span>
  );
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        ticketStatusStyles[status],
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function CvssBadge({ score }: { score: number }) {
  const severity: VulnSeverity =
    score >= 9 ? "critical" : score >= 7 ? "high" : score >= 4 ? "medium" : score > 0 ? "low" : "info";
  return (
    <span className="inline-flex items-center gap-1">
      <SeverityBadge severity={severity} />
      <span className="text-xs tabular-nums text-slate-500">{score.toFixed(1)}</span>
    </span>
  );
}

export function SlaIndicator({ dueDate, breached }: { dueDate: string; breached: boolean }) {
  const due = new Date(dueDate);
  const now = new Date();
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (breached) {
    return <span className="text-xs font-medium text-red-600">SLA breached</span>;
  }
  if (daysLeft <= 3) {
    return <span className="text-xs font-medium text-amber-600">{daysLeft}d left</span>;
  }
  return <span className="text-xs text-slate-500">{daysLeft}d left</span>;
}
