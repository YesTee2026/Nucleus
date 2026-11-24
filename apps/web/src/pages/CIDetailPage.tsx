import { PageShell, Card, CardContent, CardHeader, CardTitle } from "@/components/layout/PageShell";
import {
  RelationshipGraph,
  RelationshipLegend,
  RelationshipList,
} from "@/components/cmdb/RelationshipGraph";
import { CIVulnerabilitiesPanel } from "@/components/vuln/CIVulnerabilitiesPanel";
import { EnvironmentBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import {
  Card as UiCard,
  CardContent as UiCardContent,
} from "@/components/ui/Card";
import type { CiStatus, Environment } from "@/data/mock";
import { cn, formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { ArrowLeft, GitBranch, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

type Tab = "overview" | "vulnerabilities";

export function CIDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getCiById,
    getFieldsForClass,
    getRelationshipsForCi,
    updateCi,
    deleteCi,
    addRelationship,
    cis,
    relationshipTypes,
  } = useAppStore();
  const ci = id ? getCiById(id) : undefined;
  const relatedCount = id ? getRelationshipsForCi(id).length : 0;
  const [tab, setTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [relOpen, setRelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<Environment>("production");
  const [status, setStatus] = useState<CiStatus>("active");
  const [targetCiId, setTargetCiId] = useState("");
  const [relationshipTypeId, setRelationshipTypeId] = useState(relationshipTypes[0]?.id ?? "");

  if (!ci) {
    return (
      <PageShell
        header={
          <div className="border-b border-slate-200 px-6 py-4">
            <h1 className="text-lg font-semibold">CI Not Found</h1>
          </div>
        }
      >
        <UiCard>
          <UiCardContent className="py-12 text-center">
            <p className="text-slate-600">This configuration item does not exist.</p>
            <Link to="/configuration-items">
              <Button variant="secondary" className="mt-4">
                Back to list
              </Button>
            </Link>
          </UiCardContent>
        </UiCard>
      </PageShell>
    );
  }

  const fields = getFieldsForClass(ci.classId);

  return (
    <PageShell
      header={
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-4 px-6">
            <div className="flex min-w-0 items-center gap-4">
              <Link
                to="/configuration-items"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-lg font-semibold text-slate-900">{ci.name}</h1>
                  <StatusBadge status={ci.status} />
                  <EnvironmentBadge env={ci.environment} />
                </div>
                <p className="text-sm text-slate-500">
                  {ci.className} · Updated {formatRelativeDate(ci.updatedAt)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setName(ci.name);
                  setEnvironment(ci.environment);
                  setStatus(ci.status);
                  setEditOpen(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setTargetCiId(cis.find((c) => c.id !== ci.id)?.id ?? "");
                  setRelOpen(true);
                }}
              >
                <GitBranch className="h-3.5 w-3.5" />
                Add Relationship
              </Button>
              <Button variant="secondary" size="icon" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
          <div className="flex gap-1 px-6 pb-0">
            {(
              [
                { id: "overview" as Tab, label: "Overview" },
                { id: "vulnerabilities" as Tab, label: "Vulnerabilities" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  tab === t.id
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-500 hover:text-slate-700",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {tab === "vulnerabilities" ? (
        <CIVulnerabilitiesPanel ciId={ci.id} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Attributes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field) => {
                  const value = ci.attributes[field.name] ?? ci.name;
                  const displayValue =
                    field.name === "name"
                      ? ci.name
                      : field.name === "environment"
                        ? ci.environment
                        : value;

                  return (
                    <div key={field.id}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {field.displayName}
                      </dt>
                      <dd className="mt-1 text-sm text-slate-900">
                        {displayValue !== undefined && displayValue !== ""
                          ? String(displayValue)
                          : "—"}
                      </dd>
                    </div>
                  );
                })}
                {Object.entries(ci.attributes)
                  .filter(([key]) => !fields.some((f) => f.name === key))
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {key.replace(/_/g, " ")}
                      </dt>
                      <dd className="mt-1 text-sm text-slate-900">{String(value)}</dd>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Relationships</CardTitle>
              </CardHeader>
              <CardContent>
                <RelationshipList ciId={ci.id} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Relationship Map</CardTitle>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Impact preview — downstream dependencies highlighted
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <RelationshipLegend />
                <div className="mt-4">
                  <RelationshipGraph centerCiId={ci.id} height={480} />
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Impact Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: "Direct dependencies",
                      value: String(relatedCount),
                      color: "text-brand-700",
                    },
                    {
                      label: "Transitive impact",
                      value: String(Math.max(relatedCount, relatedCount * 2)),
                      color: "text-amber-700",
                    },
                    { label: "Scheduled conflicts", value: "1", color: "text-red-700" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 text-center"
                    >
                      <p className={`text-2xl font-semibold tabular-nums ${stat.color}`}>
                        {stat.value}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Configuration Item"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateCi(ci.id, { name, environment, status });
                setEditOpen(false);
              }}
            >
              Save Changes
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
              <option value="retired">Retired</option>
            </Select>
          </label>
        </div>
      </Modal>

      <Modal
        open={relOpen}
        onClose={() => setRelOpen(false)}
        title="Add Relationship"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRelOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!targetCiId}
              onClick={() => {
                addRelationship({
                  sourceCiId: ci.id,
                  targetCiId,
                  relationshipTypeId,
                });
                setRelOpen(false);
              }}
            >
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Type</span>
            <Select
              value={relationshipTypeId}
              onChange={(e) => setRelationshipTypeId(e.target.value)}
            >
              {relationshipTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Target CI</span>
            <Select value={targetCiId} onChange={(e) => setTargetCiId(e.target.value)}>
              {cis
                .filter((c) => c.id !== ci.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete configuration item?"
        description={`This will permanently remove “${ci.name}” and its relationships from the CMDB.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          deleteCi(ci.id);
          navigate("/configuration-items");
        }}
      />
    </PageShell>
  );
}
