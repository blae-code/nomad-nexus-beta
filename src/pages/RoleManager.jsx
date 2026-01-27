import { useEffect } from "react";
import AdminCockpitPage from "./AdminCockpit";
import { useSearchParams } from "react-router-dom";

// Forward to AdminCockpit with roles tab active
export default function RoleManagerPage() {
  const [, setSearchParams] = useSearchParams();

  useEffect(() => {
    // This is just a thin wrapper for backward compatibility
  }, [setSearchParams]);

  // Render AdminCockpit (will redirect attention to roles tab)
  return <AdminCockpitPage initialTab="roles" />;
}