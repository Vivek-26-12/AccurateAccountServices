// Forwards to the new combined Global User Provider to eliminate redundant state
export { useAuth, UserProvider as AuthProvider } from './UserProvider';