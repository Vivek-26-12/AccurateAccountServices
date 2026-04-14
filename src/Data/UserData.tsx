// Forwards to the new combined Global User Provider to eliminate redundant state
import React from 'react';
export { useUserContext } from './UserProvider';

// Dummy provider to not break main.tsx (the real state is in UserProvider/AuthProvider)
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;