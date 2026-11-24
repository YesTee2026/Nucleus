import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import {
  CONFIDENCE_VARIANT,
  type DiscoveryConfidence,
  type ReviewQueueItem,
} from "@/data/discovery-mock";
import { formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { Check, Clock, Save, Settings2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function ConfidenceBadge({ confidence }: { confidence: keyof typeof CONFIDENCE_VARIANT }) {
  const variant = CONFIDENCE_VARIANT[confidence];
  const classes =
    variant === "success"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-300/30"
      : variant === "warning"
        ? "bg-amber-100 text-amber-800 ring-amber-300/30"
        : "bg-red-100 text-red-800 ring-red-300/30";
  return <Badge className={classes}>{confidence}</Badge>;
}

type Draft = {
  name: string;
  className: string;
  confidence: DiscoveryConfidence;
  matchKeysText: string;
  attributesText: string;
  matchCiId: string;
  matchCiName: string;
};

function toDraft(item: ReviewQueueItem): Draft {
  return {
    name: item.normalizedCi.name ?? "",
    className: item.normalizedCi.class,
    confidence: item.confidence,
    matchKeysText: JSON.stringify(item.normalizedCi.matchKeys, null, 2),
    attributesText: JSON.stringify(item.normalizedCi.attributes, null, 2),
    matchCiId: item.matchCiId ?? "",
    matchCiName: item.matchCiName ?? "",
  };
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

export function ReviewQueuePage() {
  const {
    reviewQueue,
    classes,
    cis,
    updateReviewItem,
    approveReviewItem,
    rejectReviewItem,
    toast,
  } = useAppStore();
  const pending = reviewQueue.filter((r) => r.status === "pending");
  const concrete = classes.filter((c) => !c.isAbstract);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const pendingIds = pending.map((p) => p.id).join(",");

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const item of pending) {
        if (!next[item.id]) next[item.id] = toDraft(item);
      }
      for (const id of Object.keys(next)) {
        if (!pending.some((p) => p.id === id)) delete next[id];
      }
      return next;
    });
    setExpandedId((current) => {
      if (current && pending.some((p) => p.id === current)) return current;
      return pending[0]?.id ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync drafts when queue membership changes
  }, [pendingIds]);

  const active = useMemo(
    () => pending.find((p) => p.id === expandedId) ?? pending[0],
    [pending, expandedId],
  );
  const draft = active ? drafts[active.id] : undefined;

  const setDraftField = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    if (!active) return;
    setDrafts((prev) => ({
      ...prev,
      [active.id]: { ...(prev[active.id] ?? toDraft(active)), [key]: value },
    }));
  };

  const buildPatch = (item: ReviewQueueItem, d: Draft) => {
    const matchKeys = parseRecord(d.matchKeysText);
    const attributes = parseRecord(d.attributesText);
    if (!matchKeys || !attributes) return null;
    const matchKeysTyped: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(matchKeys)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        matchKeysTyped[k] = v;
      } else {
        matchKeysTyped[k] = String(v);
      }
    }
    return {
      name: d.name || undefined,
      className: d.className,
      confidence: d.confidence,
      matchKeys: matchKeysTyped,
      attributes,
      matchCiId: d.matchCiId.trim() ? d.matchCiId.trim() : null,
      matchCiName: d.matchCiName.trim() ? d.matchCiName.trim() : null,
    };
  };

  const saveDraft = () => {
    if (!active || !draft) return;
    const patch = buildPatch(active, draft);
    if (!patch) {
      toast("Match keys and attributes must be valid JSON objects", "error");
      return;
    }
    updateReviewItem(active.id, patch);
    toast("Review item updated");
  };

  const approve = () => {
    if (!active || !draft) return;
    const patch = buildPatch(active, draft);
    if (!patch) {
      toast("Match keys and attributes must be valid JSON objects", "error");
      return;
    }
    approveReviewItem(active.id, patch);
  };

  return (
    <PageShell
      header={
        <Header
          title="Discovery Review Queue"
          description="Edit discovered fields, then approve or reject before they merge into the CMDB"
        />
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <Link to="/discovery">
          <Button variant="secondary" size="sm">
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
          <Button variant="secondary" size="sm" className="bg-brand-50 text-brand-700 ring-brand-200">
            <Clock className="h-3.5 w-3.5" />
            Review Queue
          </Button>
        </Link>
      </div>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-slate-500">
            Review queue is empty. Run a discovery source to enqueue new items.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0">
              {pending.map((item) => {
                const isActive = item.id === active?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExpandedId(item.id)}
                    className={`block w-full px-4 py-3 text-left transition ${
                      isActive ? "bg-brand-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-900">
                        {drafts[item.id]?.name ||
                          item.normalizedCi.name ||
                          String(Object.values(item.normalizedCi.matchKeys)[0] ?? "Unknown CI")}
                      </span>
                      <ConfidenceBadge confidence={drafts[item.id]?.confidence ?? item.confidence} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {item.sourceName} · {formatRelativeDate(item.createdAt)}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {active && draft && (
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {draft.name || active.normalizedCi.name || "Untitled CI"}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {active.sourceName} · {formatRelativeDate(active.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={saveDraft}>
                      <Save className="h-3.5 w-3.5" />
                      Save edits
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => rejectReviewItem(active.id)}>
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button size="sm" onClick={approve}>
                      <Check className="h-3.5 w-3.5" />
                      {draft.matchCiId ? "Merge" : "Create CI"}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Name</span>
                    <Input
                      value={draft.name}
                      onChange={(e) => setDraftField("name", e.target.value)}
                      placeholder="CI display name"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">CI class</span>
                    <Select
                      value={draft.className}
                      onChange={(e) => setDraftField("className", e.target.value)}
                    >
                      {concrete.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.displayName} ({c.name})
                        </option>
                      ))}
                      {!concrete.some((c) => c.name === draft.className) && (
                        <option value={draft.className}>{draft.className}</option>
                      )}
                    </Select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Confidence</span>
                    <Select
                      value={draft.confidence}
                      onChange={(e) =>
                        setDraftField("confidence", e.target.value as DiscoveryConfidence)
                      }
                    >
                      <option value="high">high</option>
                      <option value="medium">medium</option>
                      <option value="low">low</option>
                    </Select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Match existing CI</span>
                    <Select
                      value={draft.matchCiId}
                      onChange={(e) => {
                        const id = e.target.value;
                        const ci = cis.find((c) => c.id === id);
                        setDrafts((prev) => ({
                          ...prev,
                          [active.id]: {
                            ...(prev[active.id] ?? toDraft(active)),
                            matchCiId: id,
                            matchCiName: ci?.name ?? "",
                          },
                        }));
                      }}
                    >
                      <option value="">None — create new CI</option>
                      {cis.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.className})
                        </option>
                      ))}
                    </Select>
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

                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Raw discovery preview
                  </p>
                  <pre className="max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-600">
                    {JSON.stringify(active.rawPreview, null, 2)}
                  </pre>
                </div>

                {draft.matchCiId ? (
                  <p className="text-sm text-brand-600">
                    Will merge into{" "}
                    <span className="font-medium">{draft.matchCiName || draft.matchCiId}</span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">No existing CI match — will create new CI</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </PageShell>
  );
}
