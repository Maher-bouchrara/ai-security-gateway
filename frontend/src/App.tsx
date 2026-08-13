import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import PrivateRoute from './components/PrivateRoute'
import ChatWindow from './pages/ChatPage'

function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#2B3674] dark:text-white">
        Contenu de test
      </h1>
      <p className="text-[#A3AED0] mt-2">La sidebar est à gauche</p>
    </div>
  )
}

function ProtectedLayout() {
  return (
    <div className="flex min-h-screen bg-[#F4F7FE] dark:bg-[#0B1437]">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen">
        <Routes>
          <Route path="/chat" element={<ChatWindow />} />
          <Route path="/dashboard" element={<TestPage />} />
          <Route path="*" element={<Navigate to="/chat" />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <PrivateRoute>
            <ProtectedLayout />
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}