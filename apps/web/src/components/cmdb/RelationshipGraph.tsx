import { Badge } from "@/components/ui/Badge";
import { useAppStore } from "@/store/AppStore";
import {
  Background,
  BaseEdge,
  Controls,
  Edge,
  EdgeLabelRenderer,
  EdgeProps,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  getSmoothStepPath,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";

const classColors: Record<string, string> = {
  Server: "#0d9488",
  Database: "#7c3aed",
  Application: "#2563eb",
  "Network Device": "#d97706",
  "Business Service": "#db2777",
};

const relationColors: Record<string, string> = {
  "Runs On": "#0d9488",
  "Depends On": "#2563eb",
  Hosts: "#7c3aed",
  "Connects To": "#d97706",
  "Located In": "#64748b",
  "Backed By": "#db2777",
};

interface CiNodeData {
  label: string;
  className: string;
  ciId: string;
  isCenter?: boolean;
  enterDelay?: number;
  depth?: number;
}

function CiNode({ data }: NodeProps) {
  const d = data as CiNodeData;
  const color = classColors[d.className] ?? "#64748b";
  return (
    <div
      className={`rf-node-enter group relative overflow-hidden rounded-xl border bg-white px-4 py-3 shadow-md transition-shadow hover:shadow-lg ${
        d.isCenter ? "ring-2 ring-brand-500 ring-offset-2" : ""
      }`}
      style={{
        borderColor: `${color}66`,
        minWidth: 156,
        animationDelay: `${d.enterDelay ?? 0}ms`,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400"
      />
      <span
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div className="pl-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
        {d.className}
        {typeof d.depth === "number" && d.depth > 0 && (
          <span className="ml-1 font-normal text-slate-400">· hop {d.depth}</span>
        )}
      </div>
      <Link
        to={`/configuration-items/${d.ciId}`}
        className="mt-0.5 block pl-2 text-sm font-semibold text-slate-900 transition-colors hover:text-brand-700"
      >
        {d.label}
      </Link>
      {d.isCenter && (
        <div className="mt-1 pl-2 text-[10px] font-medium text-brand-700">Architecture root</div>
      )}
    </div>
  );
}

function AnimatedRelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  label,
  data,
}: EdgeProps) {
  const color = (data as { color?: string } | undefined)?.color ?? "#0d9488";
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
    offset: 24,
  });

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeOpacity={0.14}
        className="rf-edge-halo"
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: 2.75,
          strokeLinecap: "round",
        }}
      />
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={2.75}
        strokeLinecap="round"
        className="rf-edge-flow"
        style={{ opacity: 0.95 }}
      />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <span
              className="rounded-full border bg-white px-2.5 py-0.5 text-[10px] font-semibold shadow-sm"
              style={{ borderColor: `${color}55`, color }}
            >
              {String(label)}
            </span>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const nodeTypes = { ciNode: CiNode };
const edgeTypes = { animatedRel: AnimatedRelationshipEdge };

function buildEdge(
  r: {
    id: string;
    sourceCiId: string;
    targetCiId: string;
    relationshipTypeName: string;
  },
  opts?: { emphasize?: boolean },
): Edge {
  const color = relationColors[r.relationshipTypeName] ?? "#0d9488";
  return {
    id: r.id,
    source: r.sourceCiId,
    target: r.targetCiId,
    label: r.relationshipTypeName,
    type: "animatedRel",
    animated: false,
    data: { color },
    style: { stroke: color, strokeWidth: opts?.emphasize ? 3 : 2.75 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color,
    },
  };
}

interface RelationshipGraphProps {
  centerCiId: string;
  height?: number;
}

export function RelationshipGraph({ centerCiId, height = 400 }: RelationshipGraphProps) {
  const { cis, getCiById, getRelationshipsForCi } = useAppStore();

  const { initialNodes, initialEdges } = useMemo(() => {
    const center = getCiById(centerCiId);
    if (!center) return { initialNodes: [] as Node[], initialEdges: [] as Edge[] };

    const rels = getRelationshipsForCi(centerCiId);
    const relatedIds = new Set<string>([centerCiId]);
    for (const r of rels) {
      relatedIds.add(r.sourceCiId);
      relatedIds.add(r.targetCiId);
    }

    const relatedCis = cis.filter((ci) => relatedIds.has(ci.id));
    const nodes: Node[] = relatedCis.map((ci, i) => {
      const isCenter = ci.id === centerCiId;
      const angle = (i / Math.max(relatedCis.length, 1)) * 2 * Math.PI - Math.PI / 2;
      const radius = isCenter ? 0 : 220;
      return {
        id: ci.id,
        type: "ciNode",
        position: {
          x: 280 + radius * Math.cos(angle),
          y: 200 + radius * Math.sin(angle),
        },
        data: {
          label: ci.name,
          className: ci.className,
          ciId: ci.id,
          isCenter,
          enterDelay: i * 40,
          depth: isCenter ? 0 : 1,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    });

    const edges = rels.map((r) => buildEdge(r, { emphasize: true }));
    return { initialNodes: nodes, initialEdges: edges };
  }, [centerCiId, cis, getCiById, getRelationshipsForCi]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (initialNodes.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
        No relationships found
      </div>
    );
  }

  return (
    <div style={{ height }} className="rf-chart-canvas overflow-hidden rounded-xl border border-slate-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        elementsSelectable
      >
        <Background gap={22} size={1.2} color="#cbd5e1" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => classColors[(n.data as { className: string }).className] ?? "#64748b"}
          maskColor="rgba(248, 250, 252, 0.75)"
        />
      </ReactFlow>
    </div>
  );
}

export function RelationshipLegend() {
  return (
    <div className="flex flex-wrap gap-3">
      {Object.entries(classColors).map(([name, color]) => (
        <div key={name} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {name}
        </div>
      ))}
    </div>
  );
}

interface FullRelationshipGraphProps {
  height?: number;
  /** Application / Business Service / any CI used as architecture root */
  rootCiId: string;
  maxDepth?: number;
}

/**
 * App-centric architecture chart: start from an application (or service),
 * walk related CIs, and draw the dependency map for impact analysis.
 */
export function FullRelationshipGraph({
  height = 600,
  rootCiId,
  maxDepth = 4,
}: FullRelationshipGraphProps) {
  const { cis, relationships, getCiById } = useAppStore();

  const { initialNodes, initialEdges, relatedCount } = useMemo(() => {
    const root = getCiById(rootCiId);
    if (!root) {
      return { initialNodes: [] as Node[], initialEdges: [] as Edge[], relatedCount: 0 };
    }

    // Undirected BFS from the app root through all relationship edges
    const adjacency = new Map<string, { otherId: string; rel: (typeof relationships)[number] }[]>();
    for (const r of relationships) {
      if (!adjacency.has(r.sourceCiId)) adjacency.set(r.sourceCiId, []);
      if (!adjacency.has(r.targetCiId)) adjacency.set(r.targetCiId, []);
      adjacency.get(r.sourceCiId)!.push({ otherId: r.targetCiId, rel: r });
      adjacency.get(r.targetCiId)!.push({ otherId: r.sourceCiId, rel: r });
    }

    const depthOf = new Map<string, number>([[rootCiId, 0]]);
    const parentEdge = new Map<string, (typeof relationships)[number]>();
    const queue = [rootCiId];
    const includedRels = new Map<string, (typeof relationships)[number]>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      const depth = depthOf.get(current) ?? 0;
      if (depth >= maxDepth) continue;

      for (const { otherId, rel } of adjacency.get(current) ?? []) {
        includedRels.set(rel.id, rel);
        if (!depthOf.has(otherId)) {
          depthOf.set(otherId, depth + 1);
          parentEdge.set(otherId, rel);
          queue.push(otherId);
        }
      }
    }

    // Layout: root at top, then rings by hop depth
    const byDepth = new Map<number, string[]>();
    for (const [id, depth] of depthOf) {
      const list = byDepth.get(depth) ?? [];
      list.push(id);
      byDepth.set(depth, list);
    }

    const nodes: Node[] = [];
    const depths = [...byDepth.keys()].sort((a, b) => a - b);
    for (const depth of depths) {
      const ids = byDepth.get(depth) ?? [];
      const y = 40 + depth * 165;
      ids.forEach((id, i) => {
        const ci = getCiById(id);
        if (!ci) return;
        const spread = Math.max(ids.length - 1, 1);
        const x = ids.length === 1 ? 420 : 40 + (i / spread) * 820;
        nodes.push({
          id,
          type: "ciNode",
          position: { x, y },
          data: {
            label: ci.name,
            className: ci.className,
            ciId: ci.id,
            isCenter: id === rootCiId,
            enterDelay: depth * 80 + i * 35,
            depth,
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });
      });
    }

    const edges = [...includedRels.values()].map((r) => buildEdge(r, { emphasize: true }));

    return {
      initialNodes: nodes,
      initialEdges: edges,
      relatedCount: Math.max(0, depthOf.size - 1),
    };
  }, [cis, relationships, rootCiId, maxDepth, getCiById]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (initialNodes.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
        Select an application to map its architecture
      </div>
    );
  }

  if (relatedCount === 0) {
    return (
      <div className="space-y-3">
        <div
          style={{ height: 280 }}
          className="rf-chart-canvas overflow-hidden rounded-xl border border-slate-200"
        >
          <ReactFlow
            nodes={nodes}
            edges={[]}
            onNodesChange={onNodesChange}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            nodesConnectable={false}
          >
            <Background gap={22} size={1.25} color="#94a3b8" style={{ opacity: 0.35 }} />
          </ReactFlow>
        </div>
        <p className="text-sm text-slate-500">
          This CI has no linked relationships yet. Add relationships to build the architecture map.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        style={{ height }}
        className="rf-chart-canvas overflow-hidden rounded-xl border border-slate-200 shadow-inner"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
          maxZoom={1.6}
          nodesConnectable={false}
          defaultEdgeOptions={{ type: "animatedRel" }}
        >
          <Background id="dots" gap={22} size={1.25} color="#94a3b8" style={{ opacity: 0.35 }} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => classColors[(n.data as { className: string }).className] ?? "#64748b"}
            maskColor="rgba(248, 250, 252, 0.72)"
            className="!rounded-lg !border-slate-200 !shadow-sm"
          />
        </ReactFlow>
      </div>
      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{relatedCount}</span> related CI
        {relatedCount === 1 ? "" : "s"} within {maxDepth} hops of the selected app — use this map for
        impact analysis when something fails.
      </p>
    </div>
  );
}

export function RelationshipList({ ciId }: { ciId: string }) {
  const { getRelationshipsForCi, getCiById } = useAppStore();
  const rels = getRelationshipsForCi(ciId);

  return (
    <div className="space-y-2">
      {rels.length === 0 && <p className="text-sm text-slate-500">No relationships yet.</p>}
      {rels.map((rel) => {
        const isOutgoing = rel.sourceCiId === ciId;
        const otherId = isOutgoing ? rel.targetCiId : rel.sourceCiId;
        const other = getCiById(otherId);
        if (!other) return null;

        return (
          <div
            key={rel.id}
            className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3"
          >
            <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
              {rel.relationshipTypeName}
            </Badge>
            <span className="text-xs text-slate-500">{isOutgoing ? "→" : "←"}</span>
            <Link
              to={`/configuration-items/${other.id}`}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              {other.name}
            </Link>
            <span className="text-xs text-slate-400">({other.className})</span>
          </div>
        );
      })}
    </div>
  );
}
