import { Header } from "@/components/layout/Header";
import { PageShell, StatCard, Card, CardContent, CardHeader, CardTitle } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  buildConnectionString,
  DEFAULT_PORTS,
  SOURCE_TYPE_LABELS,
  type DiscoverySourceType,
} from "@/data/discovery-mock";
import { formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { ArrowRight, CheckCircle2, Clock, PlugZap, Radar, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function DiscoveryPage() {
  const {
    discoverySources,
    reviewQueue,
    discoveryStats,
    addDiscoverySource,
    testDiscoveryConnection,
    runDiscoverySource,
  } = useAppStore();
  const stats = discoveryStats();
  const recentPending = reviewQueue.filter((r) => r.status === "pending").slice(0, 3);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<DiscoverySourceType>("network_scan");
  const [className, setClassName] = useState("cmdb_ci_server");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(String(DEFAULT_PORTS.network_scan));
  const [connectionString, setConnectionString] = useState("");
  const [connEdited, setConnEdited] = useState(false);
  const [testing, setTesting] = useState(false);
  const [lastTestOk, setLastTestOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (connEdited) return;
    const portNum = Number(port) || DEFAULT_PORTS[type];
    setConnectionString(buildConnectionString(host, portNum, type));
  }, [host, port, type, connEdited]);

  function resetForm() {
    setName("");
    setType("network_scan");
    setClassName("cmdb_ci_server");
    setHost("");
    setPort(String(DEFAULT_PORTS.network_scan));
    setConnectionString("");
    setConnEdited(false);
    setLastTestOk(null);
  }

  function openModal() {
    resetForm();
    setOpen(true);
  }

  return (
    <PageShell
      header={
        <Header
          title="Discovery"
          description="Network scans, scripts, and field mapping into the CMDB"
          action={{ label: "Add Source", onClick: openModal }}
        />
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <Link to="/discovery">
          <Button variant="secondary" size="sm" className="bg-brand-50 text-brand-700 ring-brand-200">
            Sources
          </Button>
        </Link>
        <Link to="/discovery/mappings">
          <Button variant="secondary" size="sm">
            <Settings2 className="h-3.5 w-3.5" />
            Field Mappings
          </Button>
        </Link>
        <Link to="/discovery/review">
          <Button variant="secondary" size="sm">
            <Clock className="h-3.5 w-3.5" />
            Review Queue
            {stats.pendingReview > 0 && (
              <Badge className="ml-1 bg-amber-100 text-amber-800 ring-amber-300/30">
                {stats.pendingReview}
              </Badge>
            )}
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Discovery Sources"
          value={stats.sourceCount}
          change={`${stats.enabledSources} enabled`}
          changeType="neutral"
          icon={Radar}
        />
        <StatCard
          title="Pending Review"
          value={stats.pendingReview}
          change="Awaiting operator decision"
          changeType={stats.pendingReview > 0 ? "negative" : "positive"}
          icon={Clock}
          iconColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Merged Today"
          value={stats.mergedToday}
          change="Updates to existing CIs"
          changeType="positive"
          icon={CheckCircle2}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Created Today"
          value={stats.createdToday}
          change="New CIs from discovery"
          changeType="neutral"
          icon={Radar}
          iconColor="bg-violet-50 text-violet-600"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Discovery Sources</CardTitle>
            <Link to="/discovery/mappings" className="text-sm font-medium text-brand-600 hover:underline">
              Manage mappings
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 p-0 pb-2">
            {discoverySources.map((source) => (
              <div
                key={source.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0 hover:bg-slate-50/80"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Radar className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{source.name}</span>
                      <Badge variant="outline">{SOURCE_TYPE_LABELS[source.type]}</Badge>
                      {!source.enabled && (
                        <Badge className="bg-slate-100 text-slate-500 ring-slate-400/20">Disabled</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Target class: <span className="font-mono text-xs">{source.className}</span>
                      {" · "}
                      {source.fieldMapCount} field maps
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {source.connectionString || `${source.host}:${source.port}`}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Last run:{" "}
                      {source.lastRunAt
                        ? `${formatRelativeDate(source.lastRunAt)} (${source.lastRunStatus})`
                        : "Never"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!source.enabled}
                    onClick={() => runDiscoverySource(source.id)}
                  >
                    Run Now
                  </Button>
                  <Link to={`/discovery/mappings?source=${source.id}`}>
                    <Button variant="secondary" size="sm">
                      Mappings
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Review Queue</CardTitle>
            <Link
              to="/discovery/review"
              className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPending.length === 0 ? (
              <p className="text-sm text-slate-500">No items pending review.</p>
            ) : (
              recentPending.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-slate-900">
                      {item.normalizedCi.name ?? Object.values(item.normalizedCi.matchKeys)[0]}
                    </span>
                    <Badge
                      className={
                        item.confidence === "high"
                          ? "bg-emerald-100 text-emerald-800 ring-emerald-300/30"
                          : item.confidence === "medium"
                            ? "bg-amber-100 text-amber-800 ring-amber-300/30"
                            : "bg-red-100 text-red-800 ring-red-300/30"
                      }
                    >
                      {item.confidence}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.sourceName}</p>
                  {item.matchCiName && (
                    <p className="mt-1 text-xs text-brand-600">Match: {item.matchCiName}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Discovery Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Badge variant="brand">Raw / Script</Badge>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <Badge variant="outline">Field Maps + Aliases</Badge>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <Badge variant="outline">Canonical CI</Badge>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <Badge variant="outline">Reconciler</Badge>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <Badge variant="outline">CMDB or Review Queue</Badge>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Discovery Source"
        description="Configure a scan, script, or webhook source"
        className="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim() || !host.trim()}
              onClick={() => {
                const portNum = Number(port) || DEFAULT_PORTS[type];
                addDiscoverySource({
                  name: name.trim(),
                  type,
                  className,
                  host: host.trim(),
                  port: portNum,
                  connectionString:
                    connectionString.trim() || buildConnectionString(host, portNum, type),
                });
                resetForm();
                setOpen(false);
              }}
            >
              Create Source
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prod subnet scan"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Type</span>
            <Select
              value={type}
              onChange={(e) => {
                const next = e.target.value as DiscoverySourceType;
                setType(next);
                setPort(String(DEFAULT_PORTS[next]));
                setConnEdited(false);
                setLastTestOk(null);
              }}
            >
              <option value="network_scan">Network Scan</option>
              <option value="script">Custom Script</option>
              <option value="webhook">Webhook</option>
            </Select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Target Class</span>
            <Input value={className} onChange={(e) => setClassName(e.target.value)} />
          </label>

          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Connection
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Host</span>
                <Input
                  value={host}
                  onChange={(e) => {
                    setHost(e.target.value);
                    setLastTestOk(null);
                  }}
                  placeholder="10.0.0.10 or scan-gw.corp.local"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Port</span>
                <Input
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => {
                    setPort(e.target.value);
                    setLastTestOk(null);
                  }}
                  placeholder="22"
                />
              </label>
            </div>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-slate-600">Connection string</span>
              <Input
                value={connectionString}
                onChange={(e) => {
                  setConnectionString(e.target.value);
                  setConnEdited(true);
                  setLastTestOk(null);
                }}
                placeholder="host:port or https://host:port/path"
                className="font-mono text-xs"
              />
              <span className="mt-1 block text-xs text-slate-400">
                Auto-filled from host and port — edit to override.
              </span>
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={testing || (!host.trim() && !connectionString.trim())}
                onClick={() => {
                  setTesting(true);
                  window.setTimeout(() => {
                    const ok = testDiscoveryConnection({
                      host: host.trim(),
                      port: Number(port) || DEFAULT_PORTS[type],
                      connectionString: connectionString.trim(),
                      type,
                    });
                    setLastTestOk(ok);
                    setTesting(false);
                  }, 450);
                }}
              >
                <PlugZap className="h-3.5 w-3.5" />
                {testing ? "Testing…" : "Test Connection"}
              </Button>
              {lastTestOk === true && (
                <span className="text-xs font-medium text-emerald-600">Reachable</span>
              )}
              {lastTestOk === false && (
                <span className="text-xs font-medium text-red-600">Unreachable</span>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
