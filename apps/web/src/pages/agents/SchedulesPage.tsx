import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  AGENT_KIND_LABELS,
  SCHEDULE_CADENCE_LABELS,
  type AgentScheduleCadence,
} from "@/data/agents-mock";
import { formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { Brain, CalendarClock, Clock, Play, Warehouse } from "lucide-react";
import { Link } from "react-router-dom";

export function SchedulesPage() {
  const { agents, updateAgentSchedule, runDueAgentSchedules, runAgent } = useAppStore();
  const scheduled = agents.filter((a) => a.scheduleEnabled);
  const unscheduled = agents.filter((a) => !a.scheduleEnabled);

  return (
    <PageShell
      header={
        <Header
          title="Agent Schedules"
          description="Configure and monitor recurring agent runs"
        />
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <Link to="/agents">
          <Button variant="secondary" size="sm">
            Agents
          </Button>
        </Link>
        <Link to="/agents/schedules">
          <Button variant="secondary" size="sm" className="bg-brand-50 text-brand-700 ring-brand-200">
            <CalendarClock className="h-3.5 w-3.5" />
            Schedules
          </Button>
        </Link>
        <Link to="/agents/runs">
          <Button variant="secondary" size="sm">
            <Clock className="h-3.5 w-3.5" />
            Runs
          </Button>
        </Link>
        <Link to="/agents/staging">
          <Button variant="secondary" size="sm">
            <Warehouse className="h-3.5 w-3.5" />
            Staging
          </Button>
        </Link>
        <Link to="/agents/memory">
          <Button variant="secondary" size="sm">
            <Brain className="h-3.5 w-3.5" />
            Memory
          </Button>
        </Link>
        <Button variant="secondary" size="sm" className="ml-auto" onClick={() => runDueAgentSchedules()}>
          <Play className="h-3.5 w-3.5" />
          Run due now
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Cadence</th>
                <th className="px-4 py-3">Timezone</th>
                <th className="px-4 py-3">Next run</th>
                <th className="px-4 py-3">Last scheduled</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scheduled.map((ag) => (
                <tr key={ag.id} className="border-b border-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{ag.name}</div>
                    <div className="text-xs text-slate-500">{AGENT_KIND_LABELS[ag.kind]}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="bg-sky-100 text-sky-800 ring-sky-300/30">
                      {SCHEDULE_CADENCE_LABELS[ag.scheduleCadence]}
                    </Badge>
                    {ag.scheduleCadence === "cron" && ag.scheduleCron && (
                      <div className="mt-1 font-mono text-xs text-slate-500">{ag.scheduleCron}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{ag.scheduleTimezone}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {ag.nextRunAt ? (
                      <>
                        <div>{formatRelativeDate(ag.nextRunAt)}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(ag.nextRunAt).toLocaleString()}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {ag.lastScheduledAt ? formatRelativeDate(ag.lastScheduledAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {(
                        [
                          ["1h", "Hourly"],
                          ["daily", "Daily"],
                          ["weekly", "Weekly"],
                        ] as const
                      ).map(([cadence, label]) => (
                        <Button
                          key={cadence}
                          variant="secondary"
                          size="sm"
                          className={
                            ag.scheduleCadence === cadence
                              ? "bg-brand-50 text-brand-700 ring-brand-200"
                              : undefined
                          }
                          onClick={() =>
                            updateAgentSchedule(ag.id, {
                              scheduleEnabled: true,
                              scheduleCadence: cadence,
                              scheduleTimezone: ag.scheduleTimezone,
                            })
                          }
                        >
                          {label}
                        </Button>
                      ))}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          runAgent(ag.id, { scheduled: true, query: "manual-from-schedule" }, ag.provider)
                        }
                      >
                        Run once
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          updateAgentSchedule(ag.id, {
                            scheduleEnabled: false,
                            scheduleCadence: "manual",
                          })
                        }
                      >
                        Disable
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {scheduled.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No schedules enabled. Open an agent and click Schedule.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {unscheduled.length > 0 && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="text-sm font-semibold text-slate-900">Not scheduled</h3>
            {unscheduled.map((ag) => (
              <div
                key={ag.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 first:border-0 first:pt-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{ag.name}</p>
                  <p className="text-xs text-slate-500">{AGENT_KIND_LABELS[ag.kind]}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["1h", "Hourly"],
                      ["daily", "Daily"],
                      ["weekly", "Weekly"],
                    ] as const
                  ).map(([cadence, label]) => (
                    <Button
                      key={cadence}
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        updateAgentSchedule(ag.id, {
                          scheduleEnabled: true,
                          scheduleCadence: cadence as AgentScheduleCadence,
                          scheduleTimezone: ag.scheduleTimezone,
                        })
                      }
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
