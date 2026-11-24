import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { StagingItem } from "@/data/agents-mock";
import { formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { Brain, CalendarClock, Check, Clock, Save, Sparkles, Warehouse, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type StagingDraft = {
  proposedName: string;
  proposedClass: string;
  proposedCategory: string;
  proposedType: string;
  unknownReason: string;
  matchKeysText: string;
  attributesText: string;
  remember: boolean;
};

function toDraft(item: StagingItem, fallbackClass: string): StagingDraft {
  return {
    proposedName: item.proposedName,
    proposedClass: item.proposedClass ?? fallbackClass,
    proposedCategory: item.proposedCategory ?? "",
    proposedType: item.proposedType ?? "",
    unknownReason: item.unknownReason,
    matchKeysText: JSON.stringify(item.matchKeys, null, 2),
    attributesText: JSON.stringify(item.attributes, null, 2),
    remember: true,
  };
}

function parseStringRecord(text: string): Record<string, string> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      out[k] = typeof v === "string" ? v : String(v);
    }
    return out;
  } catch {
    return null;
  }
}

function parseRecord(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function StagingPage() {
  const {
    stagingItems,
    classes,
    updateStagingItem,
    confirmStaging,
    rejectStaging,
    instructClassifyStaging,
    bulkRejectStaging,
    reprocessStagingWithMemory,
    toast,
  } = useAppStore();
  const pending = stagingItems.filter((s) => s.status === "pending");
  const concrete = classes.filter((c) => !c.isAbstract);
  const fallbackClass = concrete[0]?.name ?? "cmdb_ci_server";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, StagingDraft>>({});
  const [instructOpen, setInstructOpen] = useState(false);
  const [instructions, setInstructions] = useState(
    "Classify IoT gateways and sensors as Network Device, category edge. Routers as network. Redis/cache as Database.",
  );
  const [instructClass, setInstructClass] = useState("");
  const [instructCategory, setInstructCategory] = useState("");
  const [instructType, setInstructType] = useState("");
  const [rememberBulk, setRememberBulk] = useState(true);
  const [promote, setPromote] = useState(false);

  const pendingSyncKey = pending
    .map(
      (p) =>
        `${p.id}:${p.proposedName}:${p.proposedClass}:${p.proposedCategory}:${p.proposedType}:${JSON.stringify(p.matchKeys)}:${JSON.stringify(p.attributes)}`,
    )
    .join("|");

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, StagingDraft> = {};
      for (const item of pending) {
        const existing = prev[item.id];
        // Keep in-progress edits for the active item; refresh others from store
        if (existing && item.id === activeId) {
          next[item.id] = existing;
        } else {
          next[item.id] = toDraft(item, fallbackClass);
        }
      }
      return next;
    });
    setActiveId((current) => {
      if (current && pending.some((p) => p.id === current)) return current;
      return pending[0]?.id ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSyncKey, fallbackClass]);

  const active = useMemo(
    () => pending.find((p) => p.id === activeId) ?? pending[0],
    [pending, activeId],
  );
  const draft = active ? drafts[active.id] : undefined;

  const allSelected = pending.length > 0 && pending.every((p) => selected.has(p.id));
  const selectedCount = useMemo(
    () => pending.filter((p) => selected.has(p.id)).length,
    [pending, selected],
  );

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(pending.map((p) => p.id)));
  };

  const selectedIds = () => pending.filter((p) => selected.has(p.id)).map((p) => p.id);

  const setDraftField = <K extends keyof StagingDraft>(key: K, value: StagingDraft[K]) => {
    if (!active) return;
    setDrafts((prev) => ({
      ...prev,
      [active.id]: { ...(prev[active.id] ?? toDraft(active, fallbackClass)), [key]: value },
    }));
  };

  const buildPatch = (d: StagingDraft) => {
    const matchKeys = parseStringRecord(d.matchKeysText);
    const attributes = parseRecord(d.attributesText);
    if (!matchKeys || !attributes) return null;
    return {
      proposedName: d.proposedName.trim() || "unnamed-asset",
      proposedClass: d.proposedClass || null,
      proposedCategory: d.proposedCategory.trim() || null,
      proposedType: d.proposedType.trim() || null,
      unknownReason: d.unknownReason,
      matchKeys,
      attributes,
    };
  };

  const saveDraft = () => {
    if (!active || !draft) return;
    const patch = buildPatch(draft);
    if (!patch) {
      toast("Match keys and attributes must be valid JSON objects", "error");
      return;
    }
    updateStagingItem(active.id, patch);
    toast("Staging item updated");
  };

  const promoteActive = () => {
    if (!active || !draft) return;
    if (!draft.proposedClass) {
      toast("Choose a CI class before promoting", "error");
      return;
    }
    const patch = buildPatch(draft);
    if (!patch) {
      toast("Match keys and attributes must be valid JSON objects", "error");
      return;
    }
    confirmStaging(active.id, {
      className: draft.proposedClass,
      category: draft.proposedCategory || undefined,
      typeHint: draft.proposedType || undefined,
      remember: draft.remember,
      name: patch.proposedName,
      matchKeys: patch.matchKeys,
      attributes: patch.attributes,
    });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(active.id);
      return next;
    });
  };

  return (
    <PageShell
      header={
        <Header
          title="CI Staging"
          description="Edit and confirm one unknown — agents learn that mapping and apply it to similar items on rerun"
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
          <Button variant="secondary" size="sm" className="bg-brand-50 text-brand-700 ring-brand-200">
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
        <Button
          variant="secondary"
          size="sm"
          className="ml-auto"
          onClick={() => reprocessStagingWithMemory()}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Rerun with learning
        </Button>
      </div>

      {pending.length > 0 && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              {selectedCount > 0
                ? `${selectedCount} selected`
                : `Select all (${pending.length})`}
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={selectedCount === 0}
                onClick={() => bulkRejectStaging(selectedIds())}
              >
                <X className="h-3.5 w-3.5" />
                Reject selected
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => reprocessStagingWithMemory({ promoteMatches: false })}
              >
                Apply memory to pending
              </Button>
              <Button
                size="sm"
                disabled={selectedCount === 0}
                onClick={() => {
                  setInstructOpen(true);
                  setPromote(false);
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Instruct classify
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {pending.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-slate-500">
            Staging queue is empty. Run a Discovery or Classification agent to park unknowns.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0">
              {pending.map((stg) => {
                const isActive = stg.id === active?.id;
                const d = drafts[stg.id];
                return (
                  <div
                    key={stg.id}
                    className={`flex items-start gap-2 px-3 py-3 ${
                      isActive ? "bg-brand-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected.has(stg.id)}
                      onChange={() => toggleOne(stg.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setActiveId(stg.id)}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-slate-900">
                          {d?.proposedName || stg.proposedName}
                        </span>
                        <Badge className="bg-amber-100 text-amber-800 ring-amber-300/30">
                          pending
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {(d?.proposedClass || stg.proposedClass) ?? "No class"} ·{" "}
                        {formatRelativeDate(stg.createdAt)}
                      </p>
                    </button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {active && draft && (
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{draft.proposedName}</h3>
                    <p className="text-sm text-slate-500">{active.unknownReason}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Confidence {Math.round(active.confidence * 100)}% ·{" "}
                      {formatRelativeDate(active.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={saveDraft}>
                      <Save className="h-3.5 w-3.5" />
                      Save edits
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => rejectStaging(active.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button size="sm" onClick={promoteActive}>
                      <Check className="h-3.5 w-3.5" />
                      Confirm & promote
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm sm:col-span-2">
                    <span className="mb-1 block text-slate-600">Name</span>
                    <Input
                      value={draft.proposedName}
                      onChange={(e) => setDraftField("proposedName", e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">CI class</span>
                    <Select
                      value={draft.proposedClass}
                      onChange={(e) => setDraftField("proposedClass", e.target.value)}
                    >
                      {concrete.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.displayName} ({c.name})
                        </option>
                      ))}
                      {draft.proposedClass &&
                        !concrete.some((c) => c.name === draft.proposedClass) && (
                          <option value={draft.proposedClass}>{draft.proposedClass}</option>
                        )}
                    </Select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Category</span>
                    <Input
                      value={draft.proposedCategory}
                      onChange={(e) => setDraftField("proposedCategory", e.target.value)}
                      placeholder="edge / compute / data"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Type</span>
                    <Input
                      value={draft.proposedType}
                      onChange={(e) => setDraftField("proposedType", e.target.value)}
                      placeholder="iot_sensor"
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="mb-1 block text-slate-600">Unknown reason / notes</span>
                    <Input
                      value={draft.unknownReason}
                      onChange={(e) => setDraftField("unknownReason", e.target.value)}
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Match keys (JSON)</span>
                    <Textarea
                      rows={8}
                      className="font-mono text-xs"
                      value={draft.matchKeysText}
                      onChange={(e) => setDraftField("matchKeysText", e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Attributes (JSON)</span>
                    <Textarea
                      rows={8}
                      className="font-mono text-xs"
                      value={draft.attributesText}
                      onChange={(e) => setDraftField("attributesText", e.target.value)}
                    />
                  </label>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.remember}
                    onChange={(e) => setDraftField("remember", e.target.checked)}
                  />
                  Teach agents from this edit (store memory + propose on similar pending items)
                </label>
                <p className="text-xs text-slate-500">
                  After confirm, similar staging rows (same type family, vendor, or category) get the
                  class proposed. Use <strong>Rerun with learning</strong> or run the Classification
                  agent again to apply memory to anything still unmatched.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Modal
        open={instructOpen}
        onClose={() => setInstructOpen(false)}
        title={`Instruct classify (${selectedCount})`}
        description="Give classification instructions for the selected staging items"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInstructOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                instructClassifyStaging(selectedIds(), {
                  instructions,
                  className: instructClass || undefined,
                  category: instructCategory || undefined,
                  typeHint: instructType || undefined,
                  remember: rememberBulk,
                  promote: false,
                });
                setInstructOpen(false);
              }}
            >
              Apply proposals
            </Button>
            <Button
              onClick={() => {
                instructClassifyStaging(selectedIds(), {
                  instructions,
                  className: instructClass || undefined,
                  category: instructCategory || undefined,
                  typeHint: instructType || undefined,
                  remember: rememberBulk,
                  promote: true,
                });
                setSelected(new Set());
                setInstructOpen(false);
              }}
            >
              Classify & promote
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Instructions</span>
            <Textarea
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Treat all IoT sensors as Network Device, category edge, type iot_sensor"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Force CI class</span>
            <Select value={instructClass} onChange={(e) => setInstructClass(e.target.value)}>
              <option value="">Infer from instructions</option>
              {concrete.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.displayName} ({c.name})
                </option>
              ))}
            </Select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Category override</span>
              <Input
                value={instructCategory}
                onChange={(e) => setInstructCategory(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Type override</span>
              <Input value={instructType} onChange={(e) => setInstructType(e.target.value)} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={rememberBulk}
              onChange={(e) => setRememberBulk(e.target.checked)}
            />
            Remember mappings in agent memory
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={promote} onChange={(e) => setPromote(e.target.checked)} />
            Prefer promote (used by Classify & promote button)
          </label>
        </div>
      </Modal>
    </PageShell>
  );
}
