import { NavLink } from "react-router-dom";

// Final Dashboard nav from the spec.
const NAV = [
  { to: "/", label: "Home", icon: "🏠", end: true },
  { to: "/market", label: "Market", icon: "📊" },
  { to: "/companies", label: "Companies", icon: "🏢" },
  { to: "/etf", label: "ETF", icon: "📈" },
  { to: "/mutual-funds", label: "Mutual Funds", icon: "💰" },
  { to: "/bonds", label: "Bonds", icon: "🏦" },
  { to: "/gold", label: "Gold", icon: "💵" },
  { to: "/silver", label: "Silver", icon: "🥈" },
  { to: "/portfolio", label: "Portfolio", icon: "📁" },
  { to: "/watchlist", label: "Watchlist", icon: "⭐" },
  { to: "/news", label: "News", icon: "📰" },
  { to: "/ai", label: "AI", icon: "🤖" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-800 bg-slate-900/40 p-3 md:block">
      <div className="mb-6 px-2 py-2 text-lg font-bold text-brand">Investment OS</div>
      <nav className="space-y-1">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive ? "bg-brand/20 text-brand" : "text-slate-300 hover:bg-slate-800"
              }`
            }
          >
            <span aria-hidden>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
