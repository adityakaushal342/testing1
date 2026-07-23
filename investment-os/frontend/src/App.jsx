import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Home from "./pages/Home.jsx";
import Market from "./pages/Market.jsx";
import Companies from "./pages/Companies.jsx";
import Company from "./pages/Company.jsx";
import Portfolio from "./pages/Portfolio.jsx";
import Watchlist from "./pages/Watchlist.jsx";
import News from "./pages/News.jsx";
import AIChat from "./pages/AIChat.jsx";
import Settings from "./pages/Settings.jsx";
import { ETFs, MutualFunds, Bonds, Gold, Silver } from "./pages/Instruments.jsx";

export default function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/market" element={<Market />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/company/:symbol" element={<Company />} />
            <Route path="/etf" element={<ETFs />} />
            <Route path="/mutual-funds" element={<MutualFunds />} />
            <Route path="/bonds" element={<Bonds />} />
            <Route path="/gold" element={<Gold />} />
            <Route path="/silver" element={<Silver />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/news" element={<News />} />
            <Route path="/ai" element={<AIChat />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
