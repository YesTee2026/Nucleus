import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppStore } from "@/store/AppStore";
import { Bell, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface HeaderProps {
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void };
}

export function Header({ title, description, action }: HeaderProps) {
  const navigate = useNavigate();
  const { cis, tickets, classes, notifications, markNotificationsRead, toast } = useAppStore();
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { cis: [], tickets: [], classes: [] };
    return {
      cis: cis.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5),
      tickets: tickets
        .filter(
          (t) =>
            t.ticketNumber.toLowerCase().includes(q) ||
            t.cveId.toLowerCase().includes(q) ||
            t.ciName.toLowerCase().includes(q),
        )
        .slice(0, 5),
      classes: classes.filter((c) => c.displayName.toLowerCase().includes(q)).slice(0, 3),
    };
  }, [query, cis, tickets, classes]);

  const unread = notifications.filter((n) => !n.read).length;
  const hasResults =
    results.cis.length > 0 || results.tickets.length > 0 || results.classes.length > 0;

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>
          {description && <p className="truncate text-sm text-slate-500">{description}</p>}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search CIs, tickets, classes..."
              className="w-72 pl-9"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              onBlur={() => window.setTimeout(() => setShowResults(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results.cis[0]) {
                  navigate(`/configuration-items/${results.cis[0].id}`);
                  setQuery("");
                  setShowResults(false);
                }
              }}
            />
            {showResults && query.trim() && (
              <div className="absolute right-0 top-full z-20 mt-1 w-80 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
                {!hasResults && (
                  <p className="px-3 py-2 text-sm text-slate-500">No matches for “{query}”</p>
                )}
                {results.cis.length > 0 && (
                  <div className="px-2 pb-1">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Configuration Items
                    </p>
                    {results.cis.map((ci) => (
                      <Link
                        key={ci.id}
                        to={`/configuration-items/${ci.id}`}
                        className="block rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setQuery("");
                          setShowResults(false);
                        }}
                      >
                        <span className="font-medium text-slate-900">{ci.name}</span>
                        <span className="ml-2 text-xs text-slate-400">{ci.className}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {results.tickets.length > 0 && (
                  <div className="px-2 pb-1">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Tickets
                    </p>
                    {results.tickets.map((t) => (
                      <Link
                        key={t.id}
                        to={`/vulnerabilities/tickets/${t.id}`}
                        className="block rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setQuery("");
                          setShowResults(false);
                        }}
                      >
                        <span className="font-mono text-brand-700">{t.ticketNumber}</span>
                        <span className="ml-2 text-xs text-slate-500">{t.ciName}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {results.classes.length > 0 && (
                  <div className="px-2">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Classes
                    </p>
                    {results.classes.map((c) => (
                      <Link
                        key={c.id}
                        to="/classes"
                        className="block rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setQuery("");
                          setShowResults(false);
                        }}
                      >
                        {c.displayName}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <Button
              variant="secondary"
              size="icon"
              aria-label="Notifications"
              onClick={() => {
                setShowNotifs((v) => !v);
                if (!showNotifs) markNotificationsRead();
              }}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </Button>
            {showNotifs && (
              <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
                {notifications.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-slate-500">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        toast(n.message, "info");
                        setShowNotifs(false);
                      }}
                    >
                      {n.message}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {action && (
            <Button size="md" onClick={action.onClick}>
              <Plus className="h-4 w-4" />
              {action.label}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
