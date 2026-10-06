import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';
import AdminDashboard from './pages/AdminDashboard';
import VoiceConsultation from './pages/VoiceConsultation';
import DocumentUpload from './pages/DocumentUpload';
import PatientProfile from './pages/PatientProfile';
import TimelinePage from './pages/TimelinePage';
import GraphPage from './pages/GraphPage';
import SummaryPage from './pages/SummaryPage';

export default function App(){return <AuthProvider><BrowserRouter><Routes>
  <Route path="/" element={<LandingPage/>}/>
  <Route path="/login" element={<LoginPage/>}/>
  <Route path="/register" element={<RegisterPage/>}/>
  <Route path="/patient/dashboard" element={<ProtectedRoute roles={['PATIENT']}><PatientDashboard/></ProtectedRoute>}/>
  <Route path="/doctor/dashboard" element={<ProtectedRoute roles={['DOCTOR','ADMIN']}><DoctorDashboard/></ProtectedRoute>}/>
  <Route path="/admin/dashboard" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard/></ProtectedRoute>}/>
  <Route path="/voice-consultation" element={<ProtectedRoute><VoiceConsultation/></ProtectedRoute>}/>
  <Route path="/document-upload" element={<ProtectedRoute><DocumentUpload/></ProtectedRoute>}/>
  <Route path="/patients/:id" element={<ProtectedRoute><PatientProfile/></ProtectedRoute>}/>
  <Route path="/patients/:id/timeline" element={<ProtectedRoute><TimelinePage/></ProtectedRoute>}/>
  <Route path="/patients/:id/graph" element={<ProtectedRoute><GraphPage/></ProtectedRoute>}/>
  <Route path="/patients/:id/summary" element={<ProtectedRoute><SummaryPage/></ProtectedRoute>}/>
  <Route path="*" element={<Navigate to="/" replace/>}/>
</Routes></BrowserRouter></AuthProvider>}
