// DataContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';

interface DataContextType {
  userVersion: number;
  clientVersion: number;
  refreshUsers: () => void;
  refreshClients: () => void;
}

const DataContext = createContext<DataContextType>({
  userVersion: 0,
  clientVersion: 0,
  refreshUsers: () => {},
  refreshClients: () => {},
});

export const DataProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [userVersion, setUserVersion] = useState(0);
  const [clientVersion, setClientVersion] = useState(0);

  const refreshUsers = useCallback(() => setUserVersion(v => v + 1), []);
  const refreshClients = useCallback(() => setClientVersion(v => v + 1), []);

  return (
    <DataContext.Provider value={{ userVersion, clientVersion, refreshUsers, refreshClients }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);