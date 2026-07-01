import { useEffect, useState } from "react";
import { Sparkles, Shirt, Calendar, Quote, RefreshCw } from "lucide-react";
import { AISummary, WeatherData } from "../types";

interface AIWeatherAdvisorProps {
  weatherData: WeatherData | null;
}

export default function AIWeatherAdvisor({ weatherData }: AIWeatherAdvisorProps) {
  const [advice, setAdvice] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAIAdvice = async () => {
    if (!weatherData) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ weatherData }),
      });

      if (response.ok) {
        const data = await response.json();
        setAdvice(data);
      } else {
        throw new Error("Could not fetch AI advice.");
      }
    } catch (err: any) {
      console.error(err);
      setError("AI Advisory currently offline. Click to retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIAdvice();
  }, [weatherData]);

  if (!weatherData) return null;

  return (
    <div id="ai-advisor-widget" className="relative w-full p-6 rounded-[32px] bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/40 shadow-sm overflow-hidden transition-all">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-36 h-36 rounded-full bg-cyan-500/5 blur-3xl" />

      {/* Title */}
      <div className="relative flex items-center justify-between mb-4 z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <Sparkles className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1 uppercase tracking-wider">
              AI weather Insights
              {advice?.isFallback && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                  Offline Fallback
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Smart forecast breakdown via Gemini</p>
          </div>
        </div>

        <button
          onClick={fetchAIAdvice}
          disabled={loading}
          className="p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all disabled:opacity-50"
          title="Regenerate Advice"
          id="regenerate-ai-advice-button"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        /* Loading Skeleton Panel */
        <div className="space-y-4 animate-pulse relative z-10">
          <div className="h-3 w-5/6 bg-cyan-200/50 dark:bg-slate-800 rounded"></div>
          <div className="h-3 w-full bg-cyan-200/50 dark:bg-slate-800 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="h-16 bg-cyan-200/30 dark:bg-slate-800/50 rounded-xl p-3"></div>
            <div className="h-16 bg-cyan-200/30 dark:bg-slate-800/50 rounded-xl p-3"></div>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-4 relative z-10">
          <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wider mb-2">{error}</p>
          <button
            onClick={fetchAIAdvice}
            className="text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all"
          >
            Retry AI Summary
          </button>
        </div>
      ) : advice ? (
        /* Render advice details */
        <div className="space-y-4 text-slate-700 dark:text-slate-300 relative z-10">
          <p className="text-xs leading-relaxed font-bold text-slate-800 dark:text-slate-200">
            {advice.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Outfit Box */}
            <div className="flex gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50">
              <div className="mt-0.5 p-1.5 h-fit rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Shirt className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                  Smart Outfit Recommendations
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                  {advice.outfit}
                </p>
              </div>
            </div>

            {/* Activities Box */}
            <div className="flex gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50">
              <div className="mt-0.5 p-1.5 h-fit rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                  Activity Planning Advice
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                  {advice.activities}
                </p>
              </div>
            </div>
          </div>

          {/* Inspirational quote */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/40 text-center justify-center">
            <Quote className="h-3 w-3 text-cyan-500" />
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
              {advice.quote}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
