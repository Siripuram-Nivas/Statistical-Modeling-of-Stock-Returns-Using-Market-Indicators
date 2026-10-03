import React from 'react';
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
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <MainContent />
      </main>
      <GuidedDemoOverlay />
    </div>
  );
}
