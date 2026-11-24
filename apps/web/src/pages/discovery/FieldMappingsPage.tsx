import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent, CardHeader, CardTitle } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  DEFAULT_FIELD_ALIASES,
  SOURCE_TYPE_LABELS,
  TARGET_FIELDS,
  TRANSFORM_LABELS,
  type FieldTransform,
} from "@/data/discovery-mock";
import { useAppStore } from "@/store/AppStore";
import { Plus, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

export function FieldMappingsPage() {
  const { discoverySources, fieldMaps, fieldAliases, addFieldMap, updateFieldMap } = useAppStore();
  const [params] = useSearchParams();
  const selectedSourceId = params.get("source") ?? discoverySources[0]?.id;
  const source = discoverySources.find((s) => s.id === selectedSourceId) ?? discoverySources[0];
  const maps = useMemo(
    () => fieldMaps.filter((m) => m.discoverySourceId === source?.id),
    [fieldMaps, source?.id],
  );

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [sourceField, setSourceField] = useState("");
  const [targetField, setTargetField] = useState("hostname");
  const [transform, setTransform] = useState<FieldTransform>("none");
  const [transformArg, setTransformArg] = useState("");

  function openCreate() {
    setEditId(null);
    setSourceField("");
    setTargetField("hostname");
    setTransform("none");
    setTransformArg("");
    setOpen(true);
  }

  function openEdit(id: string) {
    const map = fieldMaps.find((m) => m.id === id);
    if (!map) return;
    setEditId(id);
    setSourceField(map.sourceField);
    setTargetField(map.targetField);
    setTransform(map.transform);
    setTransformArg(map.transformArg ?? "");
    setOpen(true);
  }

  function save() {
    if (!source || !sourceField.trim()) return;
    if (editId) {
      updateFieldMap(editId, {
        sourceField: sourceField.trim(),
        targetField,
        transform,
        transformArg: transformArg || undefined,
      });
    } else {
      addFieldMap({
        discoverySourceId: source.id,
        sourceField: sourceField.trim(),
        targetField,
        transform,
        transformArg: transformArg || undefined,
      });
    }
    setOpen(false);
  }

  return (
    <PageShell
      header={
        <Header
          title="Field Mappings"
          description="Map discovery source fields to CMDB attributes with transforms"
          action={{ label: "Add Mapping", onClick: openCreate }}
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
          <Button variant="secondary" size="sm" className="bg-brand-50 text-brand-700 ring-brand-200">
            <Settings2 className="h-3.5 w-3.5" />
            Field Mappings
          </Button>
        </Link>
        <Link to="/discovery/review">
          <Button variant="secondary" size="sm">
            Review Queue
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {discoverySources.map((s) => (
              <Link
                key={s.id}
                to={`/discovery/mappings?source=${s.id}`}
                className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                  s.id === source?.id
                    ? "bg-brand-50 font-medium text-brand-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s.name}
                <span className="mt-0.5 block text-xs font-normal text-slate-400">
                  {SOURCE_TYPE_LABELS[s.type]}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{source?.name}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Default class: <span className="font-mono text-xs">{source?.className}</span>
                </p>
              </div>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                Add Row
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Source Field</th>
                    <th className="px-5 py-3">Target Field</th>
                    <th className="px-5 py-3">Transform</th>
                    <th className="px-5 py-3">Arg</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {maps.map((map) => (
                    <tr key={map.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3 font-mono text-xs text-slate-800">{map.sourceField}</td>
                      <td className="px-5 py-3">
                        <Badge variant="brand">{map.targetField}</Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{TRANSFORM_LABELS[map.transform]}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">
                        {map.transformArg ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(map.id)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Global Aliases</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {fieldAliases.map((alias) => (
                  <div
                    key={alias.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-xs text-slate-600">{alias.alias}</span>
                    <span className="text-slate-400">→</span>
                    <Badge variant="outline">{alias.targetField}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Built-in Alias Groups</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(DEFAULT_FIELD_ALIASES).map(([target, aliases]) => (
                  <div key={target}>
                    <Badge variant="brand" className="mb-1">
                      {target}
                    </Badge>
                    <p className="text-xs text-slate-500">{aliases.join(", ")}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Edit Field Mapping" : "Add Field Mapping"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!sourceField.trim()} onClick={save}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Source field</span>
            <Input
              value={sourceField}
              onChange={(e) => setSourceField(e.target.value)}
              placeholder="HostName"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Target field</span>
            <Select value={targetField} onChange={(e) => setTargetField(e.target.value)}>
              {TARGET_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Transform</span>
            <Select
              value={transform}
              onChange={(e) => setTransform(e.target.value as FieldTransform)}
            >
              {Object.entries(TRANSFORM_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          {(transform === "regex" || transform === "split" || transform === "default") && (
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Transform argument</span>
              <Input value={transformArg} onChange={(e) => setTransformArg(e.target.value)} />
            </label>
          )}
        </div>
      </Modal>
    </PageShell>
  );
}
