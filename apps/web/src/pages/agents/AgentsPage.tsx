import { Header } from "@/components/layout/Header";
import { PageShell, StatCard, Card, CardContent, CardHeader, CardTitle } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  AGENT_KIND_LABELS,
  PROVIDER_LABELS,
  SCHEDULE_CADENCE_LABELS,
  type AgentProvider,
  type AgentScheduleCadence,
} from "@/data/agents-mock";
import { formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { Bot, Brain, CalendarClock, Clock, FileBarChart2, Play, Warehouse } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export function AgentsPage() {
  const {
    agents,
    agentStats,
    runAgent,
    toggleAgent,
    updateAgentSchedule,
    runDueAgentSchedules,
    settings,
  } = useAppStore();
  const stats = agentStats();
  const scheduledCount = agents.filter((a) => a.scheduleEnabled).length;
  const claudeConfigured = Boolean(settings.agents.anthropicApiKey.trim());
  const cursorConfigured = Boolean(settings.agents.cursorApiKey.trim());
  const [runOpen, setRunOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(agents[0]?.id ?? "");
  const [provider, setProvider] = useState<AgentProvider>("claude");
  const [hostname, setHostname] = useState("iot-sensor-22");
  const [typeHint, setTypeHint] = useState("iot_sensor");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [cadence, setCadence] = useState<AgentScheduleCadence>("1h");
  const [cron, setCron] = useState("0 */6 * * *");
  const [timezone, setTimezone] = useState("Australia/Sydney");

  const selected = agents.find((a) => a.id === selectedId);

  const openSchedule = (agentId: string) => {
    const ag = agents.find((a) => a.id === agentId);
    if (!ag) return;
    setSelectedId(agentId);
    setScheduleEnabled(ag.scheduleEnabled);
    setCadence(ag.scheduleCadence === "manual" ? "1h" : ag.scheduleCadence);
    setCron(ag.scheduleCron ?? "0 */6 * * *");
    setTimezone(ag.scheduleTimezone);
    setScheduleOpen(true);
  };

  return (
    <PageShell
      header={
        <Header
          title="Agents"
          description="Claude and Cursor agents for discovery, classification, relationships, and CI management"
        />
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <Link to="/agents">
          <Button variant="secondary" size="sm" className="bg-brand-50 text-brand-700 ring-brand-200">
            Agents
          </Button>
        </Link>
        <Link to="/agents/reporting">
          <Button variant="secondary" size="sm">
            <FileBarChart2 className="h-3.5 w-3.5" />
            Reporting
          </Button>
        </Link>
        <Link to="/agents/schedules">
          <Button variant="secondary" size="sm">
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
            {stats.pendingStaging > 0 && (
              <Badge className="ml-1 bg-amber-100 text-amber-800 ring-amber-300/30">
                {stats.pendingStaging}
              </Badge>
            )}
          </Button>
        </Link>
        <Link to="/agents/memory">
          <Button variant="secondary" size="sm">
            <Brain className="h-3.5 w-3.5" />
            Memory
          </Button>
        </Link>
        <Button variant="secondary" size="sm" className="ml-auto" onClick={() => runDueAgentSchedules()}>
          Run due now
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Agents" value={stats.agentCount} change={`${stats.enabledAgents} enabled`} icon={Bot} />
        <StatCard
          title="Scheduled"
          value={scheduledCount}
          change="Auto-run on cadence"
          icon={CalendarClock}
          iconColor="bg-sky-50 text-sky-600"
        />
        <StatCard
          title="Pending Staging"
          value={stats.pendingStaging}
          change="Awaiting authorized confirmation"
          changeType={stats.pendingStaging > 0 ? "negative" : "positive"}
          icon={Warehouse}
          iconColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Recent Runs"
          value={stats.recentRuns.length}
          change="Across Claude & Cursor"
          icon={Play}
          iconColor="bg-emerald-50 text-emerald-600"
        />
      </div>

      <div className="mt-6 grid gap-4">
        {agents.map((ag) => (
          <Card key={ag.id} className={!ag.enabled ? "opacity-60" : undefined}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{ag.name}</h3>
                    <Badge variant="brand">{AGENT_KIND_LABELS[ag.kind]}</Badge>
                    <Badge variant="outline">{PROVIDER_LABELS[ag.provider]}</Badge>
                    {!ag.enabled && <Badge className="bg-slate-100 text-slate-500">Disabled</Badge>}
                    {ag.scheduleEnabled ? (
                      <Badge className="bg-sky-100 text-sky-800 ring-sky-300/30">
                        {SCHEDULE_CADENCE_LABELS[ag.scheduleCadence]}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Manual</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{ag.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Last run:{" "}
                    {ag.lastRunAt
                      ? `${formatRelativeDate(ag.lastRunAt)} (${ag.lastRunStatus})`
                      : "Never"}
                    {ag.scheduleEnabled && ag.nextRunAt
                      ? ` · Next: ${formatRelativeDate(ag.nextRunAt)}`
                      : null}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => toggleAgent(ag.id)}>
                  {ag.enabled ? "Disable" : "Enable"}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openSchedule(ag.id)}>
                  <CalendarClock className="h-3.5 w-3.5" />
                  Schedule
                </Button>
                {ag.kind === "reporting" ? (
                  <Link to="/agents/reporting">
                    <Button size="sm" disabled={!ag.enabled}>
                      <FileBarChart2 className="h-3.5 w-3.5" />
                      Open chat
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    disabled={!ag.enabled}
                    onClick={() => {
                      setSelectedId(ag.id);
                      setProvider(ag.provider);
                      setRunOpen(true);
                    }}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Execution providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="flex flex-wrap gap-2">
            <Badge
              className={
                claudeConfigured
                  ? "bg-emerald-100 text-emerald-800 ring-emerald-300/30"
                  : "bg-amber-100 text-amber-800 ring-amber-300/30"
              }
            >
              Claude {claudeConfigured ? "configured" : "local fallback"}
            </Badge>
            <Badge
              className={
                cursorConfigured
                  ? "bg-emerald-100 text-emerald-800 ring-emerald-300/30"
                  : "bg-amber-100 text-amber-800 ring-amber-300/30"
              }
            >
              Cursor {cursorConfigured ? "configured" : "local fallback"}
            </Badge>
          </div>
          <p>
            Agents can run on <strong>Anthropic Claude</strong> or <strong>Cursor SDK</strong>.
            Without API keys, Nucleus uses a local heuristic runner so staging and learning still
            work. Scheduled agents are checked every 15 seconds in the UI mock.
          </p>
          <Link to="/settings">
            <Button variant="secondary" size="sm">
              Configure API keys in Settings
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Modal
        open={runOpen}
        onClose={() => setRunOpen(false)}
        title={`Run ${selected?.name ?? "Agent"}`}
        description={
          selected?.kind === "classification" || selected?.kind === "manage"
            ? "Classification/Manage will re-scan staging with learned memory from your confirmations"
            : "Choose provider and input payload"
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setRunOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                runAgent(
                  selectedId,
                  {
                    name: hostname,
                    typeHint,
                    raw: { hostname, type: typeHint, vendor: "Acme" },
                    sourceQuery: "Order Portal",
                    targetQuery: "orders-db",
                    relationshipType: "depends_on",
                    query: hostname,
                  },
                  provider,
                );
                setRunOpen(false);
              }}
            >
              Execute
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Provider</span>
            <Select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AgentProvider)}
            >
              <option value="claude">Anthropic Claude</option>
              <option value="cursor">Cursor SDK</option>
            </Select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Hostname / asset name</span>
            <Input value={hostname} onChange={(e) => setHostname(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Type hint</span>
            <Input value={typeHint} onChange={(e) => setTypeHint(e.target.value)} />
          </label>
        </div>
      </Modal>

      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title={`Schedule ${selected?.name ?? "Agent"}`}
        description="Choose how often this agent should run automatically"
        footer={
          <>
            <Button variant="secondary" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateAgentSchedule(selectedId, {
                  scheduleEnabled,
                  scheduleCadence: scheduleEnabled ? cadence : "manual",
                  scheduleCron: cadence === "cron" ? cron : null,
                  scheduleTimezone: timezone,
                });
                setScheduleOpen(false);
              }}
            >
              Save schedule
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => {
                const on = e.target.checked;
                setScheduleEnabled(on);
                if (on && cadence === "manual") setCadence("1h");
              }}
            />
            Enable scheduled runs
          </label>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Run frequency</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(
                [
                  ["15m", "Every 15 min"],
                  ["1h", "Hourly"],
                  ["6h", "Every 6 hours"],
                  ["daily", "Daily"],
                  ["weekly", "Weekly"],
                  ["cron", "Custom cron"],
                ] as const
              ).map(([value, label]) => {
                const active = scheduleEnabled && cadence === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setScheduleEnabled(true);
                      setCadence(value);
                    }}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                      active
                        ? "border-brand-500 bg-brand-50 font-medium text-brand-800 ring-2 ring-brand-500/20"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Pick Hourly, Daily, Weekly, or another cadence — that also turns the schedule on.
            </p>
          </fieldset>

          {scheduleEnabled && cadence === "cron" && (
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Cron expression</span>
              <Input
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                placeholder="0 */6 * * *"
              />
              <span className="mt-1 block text-xs text-slate-400">
                5-field cron. Example: <code>0 */6 * * *</code> every 6 hours.
              </span>
            </label>
          )}

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Timezone</span>
            <Select
              value={timezone}
              disabled={!scheduleEnabled}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="Australia/Sydney">Australia/Sydney</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
            </Select>
          </label>

          {scheduleEnabled && (
            <p className="text-xs text-slate-500">
              Selected: {SCHEDULE_CADENCE_LABELS[cadence]}
              {selected?.nextRunAt
                ? ` · Next run ${formatRelativeDate(selected.nextRunAt)}`
                : " · Next run will be set on save"}
            </p>
          )}
        </div>
      </Modal>
    </PageShell>
  );
}
