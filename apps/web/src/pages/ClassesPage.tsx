import { Header } from "@/components/layout/Header";
import { PageShell, SectionHeader, Card, CardContent, CardHeader, CardTitle } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { FieldDefinition } from "@/data/mock";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { ChevronDown, ChevronRight, FolderTree, Key, Plus } from "lucide-react";
import { useState } from "react";

function ClassTreeItem({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: ReturnType<ReturnType<typeof useAppStore>["buildClassTree"]>[number];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
          isSelected ? "bg-brand-50 font-medium text-brand-800" : "text-slate-700 hover:bg-slate-50",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            onKeyDown={(e) => e.key === "Enter" && setExpanded(!expanded)}
            className="shrink-0 text-slate-400"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        ) : (
          <span className="w-4" />
        )}
        <FolderTree
          className={cn("h-4 w-4 shrink-0", node.isAbstract ? "text-slate-400" : "text-brand-600")}
        />
        <span className="flex-1 truncate">{node.displayName}</span>
        {!node.isAbstract && (
          <span className="text-xs tabular-nums text-slate-400">{node.ciCount}</span>
        )}
      </button>
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <ClassTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ClassesPage() {
  const { buildClassTree, getFieldsForClass, classes, addClass, addField } = useAppStore();
  const tree = buildClassTree();
  const [selectedClassId, setSelectedClassId] = useState<string>("ci-server");
  const fields = getFieldsForClass(selectedClassId);

  const [classOpen, setClassOpen] = useState(false);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("ci-root");
  const [isAbstract, setIsAbstract] = useState(false);

  const [fieldDisplay, setFieldDisplay] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [dataType, setDataType] = useState<FieldDefinition["dataType"]>("string");
  const [isRequired, setIsRequired] = useState(false);
  const [isDiscoveryKey, setIsDiscoveryKey] = useState(false);

  return (
    <PageShell
      header={
        <Header
          title="CI Classes"
          description="Define class hierarchy and custom field schemas"
          action={{ label: "New Class", onClick: () => setClassOpen(true) }}
        />
      }
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Class Hierarchy</CardTitle>
          </CardHeader>
          <CardContent>
            {tree.map((node) => (
              <ClassTreeItem
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedClassId}
                onSelect={setSelectedClassId}
              />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Field Definitions</CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  Inherited fields from parent classes are included
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setFieldOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add Field
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Display Name</th>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((field) => (
                    <tr key={field.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {field.displayName}
                        {field.isRequired && <span className="ml-1 text-red-500">*</span>}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">{field.name}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline">{field.dataType}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {field.isStandard && <Badge variant="brand">Standard</Badge>}
                          {field.isDiscoveryKey && (
                            <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20">
                              <Key className="mr-1 h-3 w-3" />
                              Discovery Key
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <SectionHeader
            title="Relationship Rules"
            description="Allowed relationship types for this class"
          />
          <Card>
            <CardContent className="flex flex-wrap gap-2 p-5">
              {["Runs On", "Depends On", "Hosts", "Connects To", "Located In"].map((rel) => (
                <Badge key={rel} variant="outline" className="px-3 py-1">
                  {rel}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        open={classOpen}
        onClose={() => setClassOpen(false)}
        title="New CI Class"
        footer={
          <>
            <Button variant="secondary" onClick={() => setClassOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!displayName.trim() || !name.trim()}
              onClick={() => {
                addClass({
                  name: name.trim(),
                  displayName: displayName.trim(),
                  parentId: parentId || null,
                  isAbstract,
                });
                setDisplayName("");
                setName("");
                setClassOpen(false);
              }}
            >
              Create Class
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Display name</span>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Technical name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cmdb_ci_custom"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Parent class</span>
            <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isAbstract}
              onChange={(e) => setIsAbstract(e.target.checked)}
            />
            Abstract class
          </label>
        </div>
      </Modal>

      <Modal
        open={fieldOpen}
        onClose={() => setFieldOpen(false)}
        title="Add Field"
        description={`Add a field to the selected class`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFieldOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!fieldDisplay.trim() || !fieldName.trim()}
              onClick={() => {
                addField({
                  classId: selectedClassId,
                  name: fieldName.trim(),
                  displayName: fieldDisplay.trim(),
                  dataType,
                  isRequired,
                  isDiscoveryKey,
                });
                setFieldDisplay("");
                setFieldName("");
                setFieldOpen(false);
              }}
            >
              Add Field
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Display name</span>
            <Input value={fieldDisplay} onChange={(e) => setFieldDisplay(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Field name</span>
            <Input
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="custom_attr"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Data type</span>
            <Select
              value={dataType}
              onChange={(e) => setDataType(e.target.value as FieldDefinition["dataType"])}
            >
              {["string", "number", "boolean", "date", "enum", "ip", "reference"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
            />
            Required
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDiscoveryKey}
              onChange={(e) => setIsDiscoveryKey(e.target.checked)}
            />
            Discovery key
          </label>
        </div>
      </Modal>
    </PageShell>
  );
}
