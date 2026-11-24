import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { LucideIcon } from "lucide-react";
import { Clock, Play, ScrollText } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  phase: string;
  features: string[];
}

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
  phase,
  features,
}: PlaceholderPageProps) {
  return (
    <PageShell header={<Header title={title} description={description} />}>
      <Card className="mx-auto max-w-2xl">
        <CardContent className="py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon className="h-8 w-8" />
          </div>
          <Badge variant="brand" className="mt-6">
            {phase}
          </Badge>
          <h2 className="mt-4 text-xl font-semibold text-slate-900">Coming in {phase}</h2>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
          <ul className="mt-6 space-y-2 text-left text-sm text-slate-600">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {f}
              </li>
            ))}
          </ul>
          <Button className="mt-8" disabled>
            Not yet available
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}

export function ActivitiesPage() {
  return (
    <PlaceholderPage
      title="Activities"
      description="Planned changes with conflict detection"
      icon={Clock}
      phase="Phase 4"
      features={[
        "Schedule maintenance and change windows",
        "Automatic impact expansion via relationship graph",
        "Conflict detection across overlapping activities",
        "Waive, reschedule, or coordinate conflicts",
      ]}
    />
  );
}

export function ScriptsPage() {
  return (
    <PlaceholderPage
      title="Script Studio"
      description="Create, test, and execute custom discovery scripts"
      icon={ScrollText}
      phase="Phase 3"
      features={[
        "Monaco code editor with syntax highlighting",
        "Fixture-based test runs and dry-run preview",
        "Docker-isolated script execution",
        "Structured JSON output to CMDB reconciler",
      ]}
    />
  );
}

