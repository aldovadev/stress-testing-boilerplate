"use client";

import { useNavigate } from "react-router-dom";
import { Zap, BarChart3, Radio } from "lucide-react";
import { Particles } from "@/components/ui/particles";
import { AuroraText } from "@/components/ui/aurora-text";
import { MagicCard } from "@/components/ui/magic-card";
import { ShimmerButton } from "@/components/ui/shimmer-button";

const features = [
  {
    icon: Zap,
    title: "4 Test Phases",
    description: "Smoke, Load, Stress, and Soak testing with configurable thresholds and VU profiles.",
  },
  {
    icon: Radio,
    title: "Real-Time Metrics",
    description: "Live WebSocket streaming of response times, throughput, error rates, and virtual users.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Interactive charts, threshold violations, and exportable test summaries with history.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const authEnabled = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === "true";

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gray-950">
      <Particles
        className="absolute inset-0 z-0"
        quantity={80}
        color="#f43f5e"
        ease={80}
        refresh
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-4xl">
        <div className="flex flex-col items-center gap-4">
          <img src="/images/stresster.svg" alt="Stresster" className="w-16 h-16" />
          <AuroraText
            className="text-6xl font-bold tracking-tight"
            colors={["#f43f5e", "#fb7185", "#e11d48", "#fda4af"]}
          >
            Stresster
          </AuroraText>
          <p className="text-lg text-gray-400 max-w-xl">
            App-agnostic stress testing framework powered by k6 with a real-time metrics dashboard.
          </p>
        </div>

        <ShimmerButton
          className="px-8 py-3 text-base font-medium"
          shimmerColor="#f43f5e"
          background="rgba(244, 63, 94, 0.1)"
          onClick={() => navigate(authEnabled ? "/login" : "/dashboard")}
        >
          {authEnabled ? "Sign In" : "Open Dashboard"}
        </ShimmerButton>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 w-full">
          {features.map((feature) => (
            <MagicCard
              key={feature.title}
              className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl"
              gradientColor="#f43f5e"
              gradientOpacity={0.15}
            >
              <div className="flex flex-col items-start gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-gray-100">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            </MagicCard>
          ))}
        </div>
      </div>
    </div>
  );
}
