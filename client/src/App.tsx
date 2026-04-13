import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
import { Settings } from "./components/Settings";

function App() {
  const location = useLocation();

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-sm ${
        location.pathname === to
          ? "font-medium text-zinc-100"
          : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <nav className="mx-auto flex max-w-4xl items-center gap-6">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-blue-500">Notify</span> Me
          </h1>
          {navLink("/", "Dashboard")}
          {navLink("/settings", "Settings")}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
