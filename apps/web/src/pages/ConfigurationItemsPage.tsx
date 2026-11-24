import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent } from "@/components/layout/PageShell";
import { EnvironmentBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { CiStatus, Environment } from "@/data/mock";
import { formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export function ConfigurationItemsPage() {
  const { cis, classes, addCi, toast } = useAppStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [envFilter, setEnvFilter] = useState("all");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [classFilter, setClassFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("ci-server");
  const [environment, setEnvironment] = useState<Environment>("production");
  const [status, setStatus] = useState<CiStatus>("active");

  const concreteClasses = classes.filter((c) => !c.isAbstract);

  const filtered = useMemo(() => {
    return cis.filter((ci) => {
      const matchesSearch =
        !search ||
        ci.name.toLowerCase().includes(search.toLowerCase()) ||
        ci.className.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || ci.status === statusFilter;
      const matchesEnv = envFilter === "all" || ci.environment === envFilter;
      const matchesClass = classFilter === "all" || ci.classId === classFilter;
      return matchesSearch && matchesStatus && matchesEnv && matchesClass;
    });
  }, [cis, search, statusFilter, envFilter, classFilter]);

  return (
    <PageShell
      header={
        <Header
          title="Configuration Items"
          description="Browse and manage all configuration items in the CMDB"
          action={{ label: "New CI", onClick: () => setOpen(true) }}
        />
      }
    >
      <Card>
        <CardContent className="border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name or class..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-36"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="discovered">Discovered</option>
              <option value="draft">Draft</option>
              <option value="retired">Retired</option>
            </Select>
            <Select value={envFilter} onChange={(e) => setEnvFilter(e.target.value)} className="w-40">
              <option value="all">All environments</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </Select>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowMoreFilters((v) => !v);
                toast(showMoreFilters ? "Extra filters hidden" : "Showing class filter", "info");
              }}
            >
              <Filter className="h-4 w-4" />
              More filters
            </Button>
          </div>
          {showMoreFilters && (
            <div className="mt-3">
              <Select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-56"
              >
                <option value="all">All classes</option>
                {concreteClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </CardContent>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3">Environment</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((ci) => (
                <tr key={ci.id} className="transition-colors hover:bg-brand-50/30">
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/configuration-items/${ci.id}`}
                      className="font-medium text-brand-700 hover:text-brand-800 hover:underline"
                    >
                      {ci.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{ci.className}</td>
                  <td className="px-5 py-3.5">
                    <EnvironmentBadge env={ci.environment} />
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={ci.status} />
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {formatRelativeDate(ci.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Showing {filtered.length} of {cis.length} configuration items
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Configuration Item"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim()}
              onClick={() => {
                const created = addCi({
                  name: name.trim(),
                  classId,
                  environment,
                  status,
                });
                setName("");
                setOpen(false);
                navigate(`/configuration-items/${created.id}`);
              }}
            >
              Create CI
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="web-prod-02" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Class</span>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              {concreteClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Environment</span>
            <Select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as Environment)}
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </Select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Status</span>
            <Select value={status} onChange={(e) => setStatus(e.target.value as CiStatus)}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="discovered">Discovered</option>
            </Select>
          </label>
        </div>
      </Modal>
    </PageShell>
  );
}
