import {
  FullRelationshipGraph,
  RelationshipLegend,
} from "@/components/cmdb/RelationshipGraph";
import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent, CardHeader, CardTitle } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { GitBranch, List } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Tab = "table" | "chart";

export function RelationshipsPage() {
  const { relationships, relationshipTypes, cis, addRelationship } = useAppStore();
  const [tab, setTab] = useState<Tab>("chart");
  const [typeFilter, setTypeFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [sourceCiId, setSourceCiId] = useState(cis[0]?.id ?? "");
  const [targetCiId, setTargetCiId] = useState(cis[1]?.id ?? "");
  const [relationshipTypeId, setRelationshipTypeId] = useState(relationshipTypes[0]?.id ?? "");

  const appCandidates = useMemo(() => {
    const preferred = cis.filter((c) =>
      ["Application", "Business Service"].includes(c.className),
    );
    return preferred.length > 0 ? preferred : cis;
  }, [cis]);

  const defaultRoot =
    appCandidates.find((c) => c.name === "Order Portal")?.id ??
    appCandidates.find((c) => c.className === "Application")?.id ??
    appCandidates[0]?.id ??
    "";

  const [rootCiId, setRootCiId] = useState(defaultRoot);

  const filteredRelationships =
    typeFilter === "all"
      ? relationships
      : relationships.filter((r) => r.relationshipTypeId === typeFilter);

  const rootCi = cis.find((c) => c.id === rootCiId);

  return (
    <PageShell
      header={
        <Header
          title="Relationships"
          description="Cross-CI relationship graph and typed dependency mappings"
          action={{ label: "New Relationship", onClick: () => setOpen(true) }}
        />
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {relationshipTypes.map((rt) => (
          <button
            key={rt.id}
            type="button"
            onClick={() => setTypeFilter((prev) => (prev === rt.id ? "all" : rt.id))}
            className="text-left"
          >
            <Card
              className={cn(
                "transition-shadow hover:shadow-md",
                typeFilter === rt.id && "ring-2 ring-brand-500 ring-offset-1",
              )}
            >
              <CardContent className="p-4 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {rt.displayName}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                  {relationships.filter((r) => r.relationshipTypeId === rt.id).length}
                </p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {(
            [
              { id: "table" as Tab, label: "Table", icon: List },
              { id: "chart" as Tab, label: "Architecture", icon: GitBranch },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "table" ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter type</span>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-44"
            >
              <option value="all">All types</option>
              {relationshipTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Architecture root (app)</span>
            <Select
              value={rootCiId}
              onChange={(e) => setRootCiId(e.target.value)}
              className="min-w-[220px]"
            >
              {appCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.className})
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {tab === "table" ? (
        <Card>
          <CardHeader>
            <CardTitle>
              All Relationships
              {typeFilter !== "all" && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  (
                  {relationshipTypes.find((t) => t.id === typeFilter)?.displayName ??
                    "filtered"}
                  )
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Source CI</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Target CI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRelationships.map((rel) => {
                  const source = cis.find((c) => c.id === rel.sourceCiId);
                  const target = cis.find((c) => c.id === rel.targetCiId);
                  return (
                    <tr key={rel.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3">
                        {source ? (
                          <Link
                            to={`/configuration-items/${source.id}`}
                            className="font-medium text-brand-700 hover:underline"
                          >
                            {source.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                        {source && (
                          <span className="ml-2 text-xs text-slate-400">{source.className}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="brand">{rel.relationshipTypeName}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        {target ? (
                          <Link
                            to={`/configuration-items/${target.id}`}
                            className="font-medium text-brand-700 hover:underline"
                          >
                            {target.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                        {target && (
                          <span className="ml-2 text-xs text-slate-400">{target.className}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredRelationships.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-10 text-center text-sm text-slate-500">
                      No relationships match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>
                App architecture
                {rootCi && (
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    from {rootCi.name}
                  </span>
                )}
              </CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                Impact map from the selected app — every connected CI across dependency hops
              </p>
            </div>
            <RelationshipLegend />
          </CardHeader>
          <CardContent>
            {rootCiId ? (
              <FullRelationshipGraph height={620} rootCiId={rootCiId} maxDepth={4} />
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">
                No applications available to use as an architecture root.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Relationship"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!sourceCiId || !targetCiId || sourceCiId === targetCiId}
              onClick={() => {
                addRelationship({ sourceCiId, targetCiId, relationshipTypeId });
                setOpen(false);
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Source CI</span>
            <Select value={sourceCiId} onChange={(e) => setSourceCiId(e.target.value)}>
              {cis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Relationship type</span>
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
              {cis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </Modal>
    </PageShell>
  );
}
