import { useNavigate } from "react-router-dom";
import { Particles } from "@/components/ui/particles";
import { AuroraText } from "@/components/ui/aurora-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";

export default function LoginPage() {
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_URL || "";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gray-950">
      <Particles
        className="absolute inset-0 z-0"
        quantity={60}
        color="#f43f5e"
        ease={80}
        refresh
      />
      <div className="relative z-10 flex flex-col items-center gap-6 text-center px-6">
        <img src="/images/stresster.svg" alt="Stresster" className="w-14 h-14" />
        <AuroraText
          className="text-3xl font-bold"
          colors={["#f43f5e", "#fb7185", "#e11d48", "#fda4af"]}
        >
          Sign in to Stresster
        </AuroraText>
        <p className="text-sm text-gray-400 max-w-sm">
          Authenticate with your Google account to access the testing dashboard.
        </p>
        <ShimmerButton
          className="px-6 py-3 text-sm font-medium"
          shimmerColor="#f43f5e"
          background="rgba(244, 63, 94, 0.1)"
          onClick={() => { window.location.href = `${apiBase}/auth/google`; }}
        >
          Continue with Google
        </ShimmerButton>
        <button
          onClick={() => navigate("/")}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Back to home
        </button>
      </div>
    </div>
  );
}
