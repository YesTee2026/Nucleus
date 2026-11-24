import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent, CardHeader, CardTitle } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  isSecretConfigured,
  maskSecret,
  type PreferredAgentProvider,
} from "@/data/settings";
import { useAppStore } from "@/store/AppStore";
import { Bot, Eye, EyeOff, KeyRound, Link2, Save, Server, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function SettingsPage() {
  const { settings, updateSettings, updateAgentSettings, clearAgentApiKeys } = useAppStore();

  const [organizationName, setOrganizationName] = useState(settings.organizationName);
  const [defaultTimezone, setDefaultTimezone] = useState(settings.defaultTimezone);
  const [apiBaseUrl, setApiBaseUrl] = useState(settings.apiBaseUrl);

  const [anthropicApiKey, setAnthropicApiKey] = useState(settings.agents.anthropicApiKey);
  const [anthropicModel, setAnthropicModel] = useState(settings.agents.anthropicModel);
  const [cursorApiKey, setCursorApiKey] = useState(settings.agents.cursorApiKey);
  const [cursorModel, setCursorModel] = useState(settings.agents.cursorModel);
  const [preferredProvider, setPreferredProvider] = useState(settings.agents.preferredProvider);
  const [useLocalFallback, setUseLocalFallback] = useState(settings.agents.useLocalFallback);

  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showCursor, setShowCursor] = useState(false);
  const [section, setSection] = useState<"general" | "agents" | "api">("agents");

  useEffect(() => {
    setOrganizationName(settings.organizationName);
    setDefaultTimezone(settings.defaultTimezone);
    setApiBaseUrl(settings.apiBaseUrl);
    setAnthropicApiKey(settings.agents.anthropicApiKey);
    setAnthropicModel(settings.agents.anthropicModel);
    setCursorApiKey(settings.agents.cursorApiKey);
    setCursorModel(settings.agents.cursorModel);
    setPreferredProvider(settings.agents.preferredProvider);
    setUseLocalFallback(settings.agents.useLocalFallback);
  }, [settings]);

  const claudeOk = isSecretConfigured(anthropicApiKey);
  const cursorOk = isSecretConfigured(cursorApiKey);

  return (
    <PageShell
      header={
        <Header
          title="Settings"
          description="Platform configuration, API connectivity, and AI agent providers"
        />
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          className={section === "agents" ? "bg-brand-50 text-brand-700 ring-brand-200" : undefined}
          onClick={() => setSection("agents")}
        >
          <Bot className="h-3.5 w-3.5" />
          AI Agents
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className={section === "api" ? "bg-brand-50 text-brand-700 ring-brand-200" : undefined}
          onClick={() => setSection("api")}
        >
          <Link2 className="h-3.5 w-3.5" />
          API
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className={section === "general" ? "bg-brand-50 text-brand-700 ring-brand-200" : undefined}
          onClick={() => setSection("general")}
        >
          <Server className="h-3.5 w-3.5" />
          General
        </Button>
      </div>

      {section === "agents" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Anthropic Claude</p>
                  <p className="text-xs text-slate-500">Discovery, classification, manage</p>
                </div>
                <Badge
                  className={
                    claudeOk
                      ? "bg-emerald-100 text-emerald-800 ring-emerald-300/30"
                      : "bg-amber-100 text-amber-800 ring-amber-300/30"
                  }
                >
                  {claudeOk ? "Configured" : "Not set"}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Cursor SDK</p>
                  <p className="text-xs text-slate-500">Relationships and cloud agents</p>
                </div>
                <Badge
                  className={
                    cursorOk
                      ? "bg-emerald-100 text-emerald-800 ring-emerald-300/30"
                      : "bg-amber-100 text-amber-800 ring-amber-300/30"
                  }
                >
                  {cursorOk ? "Configured" : "Not set"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-brand-600" />
                Anthropic Claude
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">API key</span>
                <div className="flex gap-2">
                  <Input
                    type={showAnthropic ? "text" : "password"}
                    autoComplete="off"
                    placeholder={
                      claudeOk && !showAnthropic
                        ? maskSecret(anthropicApiKey)
                        : "sk-ant-…"
                    }
                    value={anthropicApiKey}
                    onChange={(e) => setAnthropicApiKey(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => setShowAnthropic((v) => !v)}
                    aria-label={showAnthropic ? "Hide key" : "Show key"}
                  >
                    {showAnthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <span className="mt-1 block text-xs text-slate-400">
                  Maps to <code className="rounded bg-slate-100 px-1">ANTHROPIC_API_KEY</code> on the
                  API process.
                </span>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Model</span>
                <Select value={anthropicModel} onChange={(e) => setAnthropicModel(e.target.value)}>
                  <option value="claude-sonnet-4-5">claude-sonnet-4-5</option>
                  <option value="claude-opus-4-5">claude-opus-4-5</option>
                  <option value="claude-haiku-4-5">claude-haiku-4-5</option>
                </Select>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-brand-600" />
                Cursor SDK
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">API key</span>
                <div className="flex gap-2">
                  <Input
                    type={showCursor ? "text" : "password"}
                    autoComplete="off"
                    placeholder={cursorOk && !showCursor ? maskSecret(cursorApiKey) : "Cursor API key"}
                    value={cursorApiKey}
                    onChange={(e) => setCursorApiKey(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => setShowCursor((v) => !v)}
                    aria-label={showCursor ? "Hide key" : "Show key"}
                  >
                    {showCursor ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <span className="mt-1 block text-xs text-slate-400">
                  Maps to <code className="rounded bg-slate-100 px-1">CURSOR_API_KEY</code> on the API
                  process.
                </span>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Model</span>
                <Select value={cursorModel} onChange={(e) => setCursorModel(e.target.value)}>
                  <option value="composer-2.5">composer-2.5</option>
                  <option value="gpt-5.2">gpt-5.2</option>
                  <option value="claude-4.6-sonnet-medium-thinking">
                    claude-4.6-sonnet-medium-thinking
                  </option>
                </Select>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agent defaults</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Preferred provider</span>
                <Select
                  value={preferredProvider}
                  onChange={(e) =>
                    setPreferredProvider(e.target.value as PreferredAgentProvider)
                  }
                >
                  <option value="auto">Auto (use each agent’s configured provider)</option>
                  <option value="claude">Prefer Claude</option>
                  <option value="cursor">Prefer Cursor</option>
                </Select>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={useLocalFallback}
                  onChange={(e) => setUseLocalFallback(e.target.checked)}
                />
                Fall back to local heuristic when API keys are missing
              </label>
              <p className="text-xs text-slate-500">
                Keys are stored in this browser for the mock UI. For the real API, also set the same
                values as environment variables (or use the API settings endpoint).
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  onClick={async () => {
                    const payload = {
                      anthropicApiKey: anthropicApiKey.trim(),
                      anthropicModel,
                      cursorApiKey: cursorApiKey.trim(),
                      cursorModel,
                      preferredProvider,
                      useLocalFallback,
                    };
                    updateAgentSettings(payload);
                    try {
                      const base = settings.apiBaseUrl.replace(/\/$/, "");
                      await fetch(`${base}/api/v1/settings/agents`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                      });
                    } catch {
                      // API may be offline — browser settings still saved
                    }
                  }}
                >
                  <Save className="h-3.5 w-3.5" />
                  Save agent settings
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    clearAgentApiKeys();
                    setAnthropicApiKey("");
                    setCursorApiKey("");
                    try {
                      const base = settings.apiBaseUrl.replace(/\/$/, "");
                      await fetch(`${base}/api/v1/settings/agents`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ anthropicApiKey: "", cursorApiKey: "" }),
                      });
                    } catch {
                      // ignore offline API
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear API keys
                </Button>
                <Link to="/agents">
                  <Button variant="secondary">Open Agents</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {section === "api" && (
        <Card>
          <CardHeader>
            <CardTitle>API connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">API base URL</span>
              <Input
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="http://localhost:3000"
              />
              <span className="mt-1 block text-xs text-slate-400">
                Used when the web app calls Nucleus API routes (agents, discovery, vuln).
              </span>
            </label>
            <Button
              onClick={() =>
                updateSettings({
                  apiBaseUrl: apiBaseUrl.trim().replace(/\/$/, ""),
                })
              }
            >
              <Save className="h-3.5 w-3.5" />
              Save API settings
            </Button>
          </CardContent>
        </Card>
      )}

      {section === "general" && (
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Organization name</span>
              <Input
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Default timezone</span>
              <Select
                value={defaultTimezone}
                onChange={(e) => setDefaultTimezone(e.target.value)}
              >
                <option value="Australia/Sydney">Australia/Sydney</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
              </Select>
            </label>
            <Button
              onClick={() =>
                updateSettings({
                  organizationName: organizationName.trim() || "Nucleus",
                  defaultTimezone,
                })
              }
            >
              <Save className="h-3.5 w-3.5" />
              Save general settings
            </Button>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
