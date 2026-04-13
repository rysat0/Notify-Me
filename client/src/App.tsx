import { Routes, Route, Link } from "react-router-dom";

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <nav className="mx-auto flex max-w-4xl items-center gap-6">
          <h1 className="text-xl font-bold">Notify Me</h1>
          <Link to="/" className="text-zinc-400 hover:text-zinc-100">
            Dashboard
          </Link>
          <Link to="/settings" className="text-zinc-400 hover:text-zinc-100">
            Settings
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Routes>
          <Route path="/" element={<p>Dashboard placeholder</p>} />
          <Route path="/settings" element={<p>Settings placeholder</p>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
