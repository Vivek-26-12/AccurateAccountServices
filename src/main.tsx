import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './Data/AuthData.tsx'; 
import { ProfileProvider } from './Data/ProfileData.tsx';
import { UserProvider } from './Data/UserData.tsx';
import { ClientProvider } from './Data/ClientData.tsx';
import { DataProvider } from './context/DataContext.tsx';
import { UnseenMessagesProvider } from './Data/UnseenMessagesContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <UserProvider>
        <UnseenMessagesProvider>
          <ClientProvider>
            <ProfileProvider>
              <DataProvider>
                <App />
              </DataProvider>
            </ProfileProvider>
          </ClientProvider>
        </UnseenMessagesProvider>
      </UserProvider>
    </AuthProvider>
  </StrictMode>
);
