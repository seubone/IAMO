import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function LogoutPage() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();

  useEffect(() => {
    // Perform logout immediately
    console.log("🚪 Performing logout...");
    logout();

    // Redirect to login after a short delay
    setTimeout(() => {
      setLocation("/login");
    }, 500);
  }, [logout, setLocation]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <p className="text-lg">Saindo...</p>
      </div>
    </div>
  );
}
