import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './ui/pages/LandingPage';
import DashboardPage from './ui/pages/DashboardPage';
import ReportPage from './ui/pages/ReportPage';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/report" element={<ReportPage />} />
            </Routes>
        </Router>
    );
}

export default App;