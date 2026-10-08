import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import DataWorkspace from './pages/DataWorkspace';
import DescriptivePage from './pages/DescriptivePage';
import CorrelationPage from './pages/CorrelationPage';
import RegressionPage from './pages/RegressionPage';
import ReportPage from './pages/ReportPage';
import MarketOverviewPage from './pages/MarketOverviewPage';
import { useApp } from './context/AppContext';
import GuidedDemoOverlay from './components/GuidedDemoOverlay';

const PAGE_TITLES = {
  landing:          'Overview',
  data:             'Market Data',
  'market-overview':'Market Overview',
  descriptive:      'Descriptive Statistics',
  correlation:      'Correlation',
  regression:       'Regression',
  evaluation:       'Model Evaluation',
  report:           'Report Generator',
};

function MainContent() {
  const { activeModule } = useApp();

  switch (activeModule) {
    case 'landing':
      return <LandingPage />;
    case 'data':
      return <DataWorkspace />;
    case 'market-overview':
      return <MarketOverviewPage />;
    case 'descriptive':
      return <DescriptivePage />;
    case 'correlation':
      return <CorrelationPage />;
    case 'regression':
      return <RegressionPage view="regression" />;
    case 'evaluation':
      return <RegressionPage view="evaluation" />;
    case 'report':
      return <ReportPage />;
    default:
      return <LandingPage />;
  }
}

export default function App() {
  const { activeModule } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pageTitle = PAGE_TITLES[activeModule] || 'Overview';

  return (
    <>
      {/* Skip link for WCAG 2.2 AA */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <div className="app-shell">
        {/* Mobile overlay */}
        <div
          className={`sidebar-overlay${sidebarOpen ? ' is-open' : ''}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main column: top-bar + content */}
        <div className="app-column">
          {/* Top bar */}
          <header className="top-bar" role="banner">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(s => !s)}
              aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={sidebarOpen}
              aria-controls="sidebar-nav"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <div className="top-bar__brand">
              <span className="top-bar__brand-name">Stock Return Prediction</span>
              <span className="top-bar__brand-sub">Market Analytics</span>
            </div>

            <span className="top-bar__page-title" aria-live="polite">{pageTitle}</span>
          </header>

          {/* Main content */}
          <main className="main-content" id="main-content">
            <MainContent />
          </main>
        </div>

        <GuidedDemoOverlay />
      </div>
    </>
  );
}
