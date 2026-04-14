import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Chat from "./components/Chat";
import { useAuth } from "./Data/AuthData";
import ProtectedRoute from "./components/ProtectedRoute";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const EmployeeDashboard = lazy(() => import("./pages/EmployeeDashboard"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const Home = lazy(() => import("./pages/Home"));
const DocumentsMain = lazy(() => import("./pages/DocumentsMain"));
const ManageUsersMain = lazy(() => import("./pages/ManageUsersMain"));
const TaskDashboard = lazy(() => import("./pages/TaskDashboard"));
const Test = lazy(() => import("./Test"));
const About = lazy(() => import("./pages/About"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));

// Loading fallback for Suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  const { user } = useAuth(); // Get user from context
  const userRole = user?.role; // Extract role safely

  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="pt-16">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employee-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['employee']}>
                    <EmployeeDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <TaskDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/documents"
                element={
                  <ProtectedRoute>
                    <DocumentsMain />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manageusers"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'employee']}>
                    <ManageUsersMain />
                  </ProtectedRoute>
                }
              />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/test" element={<Test />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        {(userRole === "admin" || userRole === "employee") && <Chat />}
      </div>
    </Router>
  );
}

export default App;
