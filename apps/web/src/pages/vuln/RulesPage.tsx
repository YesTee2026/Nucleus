import { Header } from "@/components/layout/Header";
import { PageShell, Card, CardContent, CardHeader, CardTitle, SectionHeader } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { RuleCondition } from "@/data/vuln-mock";
import { useAppStore } from "@/store/AppStore";
import { Plus, Play } from "lucide-react";
import { useState } from "react";

function ConditionRow({ condition }: { condition: RuleCondition }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 font-mono text-xs">
      <span className="text-brand-700">{condition.field}</span>
      <span className="text-slate-400">{condition.op}</span>
      <span className="text-slate-700">
        {Array.isArray(condition.value) ? condition.value.join(", ") : String(condition.value)}
      </span>
    </div>
  );
}

export function RulesPage() {
  const { rules, addRule, updateRule, testRule } = useAppStore();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("10");
  const [assignedTeam, setAssignedTeam] = useState("Platform Security");
  const [severity, setSeverity] = useState("critical");

  function openCreate() {
    setEditId(null);
    setName("");
    setPriority("10");
    setAssignedTeam("Platform Security");
    setSeverity("critical");
    setOpen(true);
  }

  function openEdit(id: string) {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;
    setEditId(id);
    setName(rule.name);
    setPriority(String(rule.priority));
    setAssignedTeam(rule.actions.assignedTeam ?? "");
    const sev = rule.conditions.find((c) => c.field === "severity");
    setSeverity(typeof sev?.value === "string" ? sev.value : "critical");
    setOpen(true);
  }

  return (
    <PageShell
      header={
        <Header
          title="Assignment Rules"
          description="Admin-defined rules for automatic ticket assignment and SLA"
          action={{ label: "New Rule", onClick: openCreate }}
        />
      }
    >
      <SectionHeader
        title="Active Rules"
        description="Evaluated in priority order — first match wins"
      />

      <div className="space-y-4">
        {[...rules]
          .sort((a, b) => a.priority - b.priority)
          .map((rule) => (
            <Card key={rule.id} className={!rule.enabled ? "opacity-60" : undefined}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{rule.name}</CardTitle>
                    <Badge variant="outline">Priority {rule.priority}</Badge>
                    {!rule.enabled && (
                      <Badge className="bg-slate-100 text-slate-500">Disabled</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => testRule(rule.id)}>
                    <Play className="h-3.5 w-3.5" />
                    Test
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(rule.id)}>
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs font-medium uppercase text-slate-500">Conditions (AND)</p>
                <div className="space-y-2">
                  {rule.conditions.map((c, i) => (
                    <ConditionRow key={i} condition={c} />
                  ))}
                </div>
                <p className="mb-2 mt-4 text-xs font-medium uppercase text-slate-500">Actions</p>
                <div className="flex flex-wrap gap-2">
                  {rule.actions.assignedTeam && (
                    <Badge variant="brand">Team: {rule.actions.assignedTeam}</Badge>
                  )}
                  {rule.actions.assigneeName && (
                    <Badge variant="outline">Assignee: {rule.actions.assigneeName}</Badge>
                  )}
                  {rule.actions.setDueDays && (
                    <Badge variant="outline">SLA: {rule.actions.setDueDays} days</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <Card className="mt-6 border-dashed">
        <CardContent className="flex flex-col items-center py-8">
          <Button variant="secondary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Assignment Rule
          </Button>
          <p className="mt-3 max-w-md text-center text-sm text-slate-500">
            Rules match on severity, CVSS score, CI class, environment, and more. Actions assign
            teams, users, and SLA due dates automatically when tickets are created.
          </p>
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Edit Assignment Rule" : "New Assignment Rule"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim() || !assignedTeam.trim()}
              onClick={() => {
                if (editId) {
                  updateRule(editId, {
                    name: name.trim(),
                    priority: Number(priority) || 10,
                    conditions: [{ field: "severity", op: "eq", value: severity }],
                    actions: { assignedTeam: assignedTeam.trim(), setDueDays: 7 },
                  });
                } else {
                  addRule({
                    name: name.trim(),
                    priority: Number(priority) || 10,
                    assignedTeam: assignedTeam.trim(),
                    severity,
                  });
                }
                setOpen(false);
              }}
            >
              Save Rule
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
            <span className="mb-1 block text-slate-600">Priority</span>
            <Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Match severity</span>
            <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Assign team</span>
            <Input value={assignedTeam} onChange={(e) => setAssignedTeam(e.target.value)} />
          </label>
        </div>
      </Modal>
    </PageShell>
  );
}
