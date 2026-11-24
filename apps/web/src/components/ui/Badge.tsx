import { cn } from "@/lib/utils";
import { CiStatus } from "@/data/mock";

const statusStyles: Record<CiStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  draft: "bg-slate-100 text-slate-600 ring-slate-500/20",
  retired: "bg-amber-50 text-amber-700 ring-amber-600/20",
  discovered: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

const severityStyles = {
  blocking: "bg-red-50 text-red-700 ring-red-600/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  info: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "brand";
}

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        variant === "default" && "bg-slate-100 text-slate-700 ring-slate-500/20",
        variant === "outline" && "bg-white text-slate-600 ring-slate-200",
        variant === "brand" && "bg-brand-50 text-brand-700 ring-brand-600/20",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: CiStatus }) {
  return (
    <Badge className={statusStyles[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function SeverityBadge({ severity }: { severity: keyof typeof severityStyles }) {
  return (
    <Badge className={severityStyles[severity]}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </Badge>
  );
}

export function EnvironmentBadge({ env }: { env: string }) {
  const styles: Record<string, string> = {
    production: "bg-violet-50 text-violet-700 ring-violet-600/20",
    staging: "bg-orange-50 text-orange-700 ring-orange-600/20",
    development: "bg-teal-50 text-teal-700 ring-teal-600/20",
  };
  return (
    <Badge className={styles[env] ?? "bg-slate-100 text-slate-600 ring-slate-500/20"}>
      {env}
    </Badge>
  );
}
