import React, { useEffect } from "react";
import AdminCockpitPage from "./AdminCockpit";

// Forward to AdminCockpit with users tab active
export default function UserManagerPage() {
  useEffect(() => {
    // This is just a thin wrapper for backward compatibility
  }, []);

  return <AdminCockpitPage initialTab="users" />;
}