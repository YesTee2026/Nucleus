import { cn } from "@/lib/utils";
import {
  Activity,
  Bot,
  Boxes,
  Brain,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock,
  FileBarChart2,
  GitBranch,
  LayoutDashboard,
  Network,
  Radar,
  ScrollText,
  Settings,
  Settings2,
  Shapes,
  Shield,
  Ticket,
  Warehouse,
  Wifi,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
  children?: NavSection[];
}

const navSections: NavSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [{ to: "/", icon: LayoutDashboard, label: "Dashboard", end: true }],
  },
  {
    id: "cmdb",
    label: "CMDB",
    items: [
      { to: "/classes", icon: Shapes, label: "CI Classes" },
      { to: "/configuration-items", icon: Boxes, label: "Configuration Items" },
      { to: "/relationships", icon: GitBranch, label: "Relationships" },
    ],
    children: [
      {
        id: "operations",
        label: "Operations",
        items: [
          { to: "/discovery", icon: Radar, label: "Discovery", end: true },
          { to: "/discovery/mappings", icon: Settings2, label: "Field Mappings" },
          { to: "/discovery/review", icon: Clock, label: "Review Queue" },
          { to: "/activities", icon: Activity, label: "Activities" },
          { to: "/scripts", icon: ScrollText, label: "Script Studio" },
        ],
      },
    ],
  },
  {
    id: "agents",
    label: "Agents",
    items: [
      { to: "/agents", icon: Bot, label: "Agents", end: true },
      { to: "/agents/reporting", icon: FileBarChart2, label: "Reporting" },
      { to: "/agents/schedules", icon: CalendarClock, label: "Schedules" },
      { to: "/agents/runs", icon: Clock, label: "Runs" },
      { to: "/agents/staging", icon: Warehouse, label: "Staging" },
      { to: "/agents/memory", icon: Brain, label: "Memory" },
    ],
  },
  {
    id: "security",
    label: "Security",
    items: [
      { to: "/vulnerabilities", icon: Shield, label: "Vuln Remediation", end: true },
      { to: "/vulnerabilities/tickets", icon: Ticket, label: "Tickets" },
      { to: "/vulnerabilities/scanners", icon: Wifi, label: "Scanners" },
      { to: "/vulnerabilities/rules", icon: Workflow, label: "Assignment Rules" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [{ to: "/settings", icon: Settings, label: "Settings" }],
  },
];

function pathMatches(pathname: string, to: string, end?: boolean) {
  if (end || to === "/") return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

function sectionContainsPath(section: NavSection, pathname: string): boolean {
  if (section.items.some((item) => pathMatches(pathname, item.to, item.end))) return true;
  return section.children?.some((child) => sectionContainsPath(child, pathname)) ?? false;
}

function collectSectionIds(sections: NavSection[]): string[] {
  return sections.flatMap((s) => [s.id, ...(s.children ? collectSectionIds(s.children) : [])]);
}

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end ?? item.to === "/"}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-active text-white"
            : "text-slate-400 hover:bg-sidebar-hover hover:text-white",
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0 opacity-80" />
      {item.label}
      <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
    </NavLink>
  );
}

function SidebarSection({
  section,
  depth = 0,
  expanded,
  onToggle,
}: {
  section: NavSection;
  depth?: number;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const isOpen = expanded[section.id] ?? true;

  return (
    <div className={cn(depth === 0 ? "mb-2" : "mb-1 mt-1")}>
      <button
        type="button"
        onClick={() => onToggle(section.id)}
        className={cn(
          "mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left transition-colors hover:bg-sidebar-hover",
          depth > 0 && "pl-5",
        )}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        )}
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wider",
            depth === 0 ? "text-slate-500" : "text-slate-500",
          )}
        >
          {section.label}
        </span>
      </button>

      {isOpen && (
        <div>
          <ul className={cn("space-y-0.5", depth > 0 && "pl-2")}>
            {section.items.map((item) => (
              <li key={item.to}>
                <NavItemLink item={item} />
              </li>
            ))}
          </ul>
          {section.children?.map((child) => (
            <SidebarSection
              key={child.id}
              section={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const activeSectionIds = useMemo(
    () =>
      collectSectionIds(navSections).filter((id) => {
        const find = (sections: NavSection[]): NavSection | undefined => {
          for (const s of sections) {
            if (s.id === id) return s;
            const nested = s.children ? find(s.children) : undefined;
            if (nested) return nested;
          }
          return undefined;
        };
        const section = find(navSections);
        return section ? sectionContainsPath(section, location.pathname) : false;
      }),
    [location.pathname],
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const id of collectSectionIds(navSections)) initial[id] = true;
    return initial;
  });

  useEffect(() => {
    if (activeSectionIds.length === 0) return;
    setExpanded((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of activeSectionIds) {
        if (!next[id]) {
          next[id] = true;
          changed = true;
        }
      }
      // Also expand parents when a child is active
      if (activeSectionIds.includes("operations") && !next.cmdb) {
        next.cmdb = true;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [activeSectionIds]);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-slate-300">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
          <Network className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-white">Nucleus</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            CMDB Platform
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <SidebarSection
            key={section.id}
            section={section}
            expanded={expanded}
            onToggle={toggle}
          />
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-lg bg-sidebar-hover p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              AK
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">Admin User</div>
              <div className="truncate text-xs text-slate-500">Administrator</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
