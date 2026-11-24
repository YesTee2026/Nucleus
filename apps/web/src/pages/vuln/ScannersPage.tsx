import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent, CardHeader, CardTitle } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ADAPTER_LABELS, type ScannerAdapterType } from "@/data/vuln-mock";
import { formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { Play, RefreshCw, Wifi } from "lucide-react";
import { useState } from "react";

export function ScannersPage() {
  const { scanners, addScanner, updateScanner, testScanner, syncScanner } = useAppStore();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [adapterType, setAdapterType] = useState<ScannerAdapterType>("trivy");
  const [baseUrl, setBaseUrl] = useState("");

  function openCreate() {
    setEditId(null);
    setName("");
    setAdapterType("trivy");
    setBaseUrl("https://");
    setOpen(true);
  }

  function openEdit(id: string) {
    const s = scanners.find((x) => x.id === id);
    if (!s) return;
    setEditId(id);
    setName(s.name);
    setAdapterType(s.adapterType);
    setBaseUrl(s.config.baseUrl ?? s.config.endpoint ?? "");
    setOpen(true);
  }

  return (
    <PageShell
      header={
        <Header
          title="Scanner Connections"
          description="Configure vulnerability scanner API integrations"
          action={{ label: "Add Scanner", onClick: openCreate }}
        />
      }
    >
      <div className="grid gap-4">
        {scanners.map((scanner) => (
          <Card key={scanner.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Wifi className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{scanner.name}</h3>
                    <Badge variant="outline">{ADAPTER_LABELS[scanner.adapterType]}</Badge>
                    {!scanner.enabled && (
                      <Badge className="bg-slate-100 text-slate-500 ring-slate-400/20">Disabled</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {scanner.config.baseUrl ?? scanner.config.endpoint}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Last sync:{" "}
                    {scanner.lastSyncAt
                      ? `${formatRelativeDate(scanner.lastSyncAt)} (${scanner.lastSyncStatus})`
                      : "Never"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => testScanner(scanner.id)}>
                  <Play className="h-3.5 w-3.5" />
                  Test
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!scanner.enabled}
                  onClick={() => syncScanner(scanner.id)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sync Now
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openEdit(scanner.id)}>
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Supported Adapters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ADAPTER_LABELS).map(([type, label]) => (
              <Badge key={type} variant="brand">
                {label}
              </Badge>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Credentials are stored in Infisical/SOPS — never in scanner configuration.
          </p>
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Edit Scanner" : "Add Scanner"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim() || !baseUrl.trim()}
              onClick={() => {
                if (editId) {
                  updateScanner(editId, {
                    name: name.trim(),
                    adapterType,
                    config: { baseUrl: baseUrl.trim() },
                  });
                } else {
                  addScanner({
                    name: name.trim(),
                    adapterType,
                    baseUrl: baseUrl.trim(),
                  });
                }
                setOpen(false);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Adapter</span>
            <Select
              value={adapterType}
              onChange={(e) => setAdapterType(e.target.value as ScannerAdapterType)}
            >
              {Object.entries(ADAPTER_LABELS).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Base URL</span>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </label>
        </div>
      </Modal>
    </PageShell>
  );
}
