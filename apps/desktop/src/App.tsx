import { HashRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { PlannedModule } from "./components/PlannedModule";
import { SettingsProvider, useSettings } from "./components/SettingsContext";
import { Sidebar } from "./components/Sidebar";
import { DashboardPage } from "./dashboard/DashboardPage";
import { MODULES } from "./lib/modules";
import { CasesPage } from "./pages/CasesPage";
import { SettingsPage } from "./pages/SettingsPage";
import type { ReactElement } from "react";

/** Modules with a real implementation. Everything else renders PlannedModule. */
const IMPLEMENTED: Record<string, () => ReactElement> = {
  dashboard: () => <DashboardPage />,
  cases: () => <CasesPage />,
  settings: () => <SettingsPage />,
};

function Routed() {
  const { mode } = useSettings();
  return (
    <Routes>
      {MODULES.map((m) => {
        // Professional-only modules redirect to the overview in Easy Mode.
        const el = !m.easy && mode === "easy" ? <Navigate to="/" replace /> : (IMPLEMENTED[m.id]?.() ?? <PlannedModule module={m} />);
        return <Route key={m.id} path={m.path} element={el} />;
      })}
      <Route
        path="*"
        element={
          <div className="py-20 text-center text-muted">
            Page not found. <Link className="text-accent" to="/">Back to overview</Link>
          </div>
        }
      />
    </Routes>
  );
}

export function AppShell() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto bg-[radial-gradient(1200px_500px_at_70%_-10%,rgb(56_189_248/0.06),transparent)] px-7 py-7">
          <Routed />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <HashRouter>
        <AppShell />
      </HashRouter>
    </SettingsProvider>
  );
}
