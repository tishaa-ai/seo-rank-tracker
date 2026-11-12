import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import Report from "./pages/Report";
import History from "./pages/History";
import ComingSoon from "./pages/ComingSoon";
import { Toaster } from "react-hot-toast";

export default function App() {
    const location = useLocation();

    const hideNavbar = ["/login", "/register"].includes(location.pathname);

    return (
        <>
            <Toaster position="top-center" />
            {!hideNavbar && <Navbar />}
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login state="login" />} />
                <Route path="/register" element={<Login state="register" />} />
                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/analyze" element={<Analyze />} />
                    <Route path="/report/:id" element={<Report />} />
                    <Route path="/history" element={<History />} />
                    {/* Rank Tracker is not in v1; original pages kept in src/pages for later */}
                    <Route path="/rank-tracker" element={<ComingSoon />} />
                    <Route path="/rank/:id" element={<ComingSoon />} />
                </Route>
            </Routes>
        </>
    );
}
