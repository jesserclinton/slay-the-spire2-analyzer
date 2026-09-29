import { NavLink, Route, Routes } from "react-router-dom";
import { CardPicks } from "./pages/CardPicks";
import { Fights } from "./pages/Fights";
import { Overview } from "./pages/Overview";
import { Relics } from "./pages/Relics";
import { RunDetail } from "./pages/RunDetail";
import { Settings } from "./pages/Settings";

export function App() {
  return (
    <div className="layout">
      <nav className="sidebar">
        <h2>STS2 Analyzer</h2>
        <NavLink to="/" end>
          Overview
        </NavLink>
        <NavLink to="/cards">Card picks</NavLink>
        <NavLink to="/relics">Relics</NavLink>
        <NavLink to="/fights">Fights</NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </nav>
      <main className="content">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/cards" element={<CardPicks />} />
          <Route path="/relics" element={<Relics />} />
          <Route path="/fights" element={<Fights />} />
          <Route path="/runs/:id" element={<RunDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
