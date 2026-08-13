import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ChannelListPage } from './pages/ChannelListPage';
import { ChannelViewPage } from './pages/ChannelViewPage';
import { ChannelSettingsPage } from './pages/ChannelSettingsPage';
import { GroupListPage } from './pages/GroupListPage';
import { GroupViewPage } from './pages/GroupViewPage';
import { ProfileEditPage } from './pages/ProfileEditPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ChannelListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/channels/:channelId"
              element={
                <ProtectedRoute>
                  <ChannelViewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/channels/:channelId/settings"
              element={
                <ProtectedRoute>
                  <ChannelSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <GroupListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId"
              element={
                <ProtectedRoute>
                  <GroupViewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute>
                  <ProfileEditPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
