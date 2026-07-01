import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, YAxis } from "recharts";
import { WeatherHourly } from "../types";

interface HourlyForecastChartProps {
  hourlyData: WeatherHourly[];
  isDarkMode: boolean;
}

export default function HourlyForecastChart({ hourlyData, isDarkMode }: HourlyForecastChartProps) {
  // Map and parse temperatures to numbers for recharts
  const chartData = hourlyData.map((item) => ({
    time: item.time,
    temp: item.temp,
    displayTemp: `${item.temp}°`,
    pop: item.pop,
    description: item.description,
  }));

  // Find min and max for responsive scale padding
  const temps = chartData.map((d) => d.temp);
  const minTemp = Math.min(...temps) - 2;
  const maxTemp = Math.max(...temps) + 2;

  // Render a custom tooltip that fits our premium theme
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="px-3 py-2 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 text-white shadow-xl border border-slate-700/50 text-xs backdrop-blur-md">
          <p className="font-bold uppercase tracking-wider text-[10px]">{data.time}</p>
          <p className="text-cyan-400 mt-0.5 font-bold">Temp: {data.temp}°C</p>
          {data.pop > 0 && <p className="text-teal-400 font-semibold">Rain: {data.pop}%</p>}
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">{data.description}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="hourly-forecast-widget" className="relative w-full p-6 rounded-[32px] bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/40 shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Hourly Performance</h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Expected temperature & precipitation changes</p>
        </div>
        <div className="flex gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 shadow-sm"></span>
            <span className="text-cyan-600 dark:text-cyan-400">Temperature</span>
          </div>
        </div>
      </div>

      <div className="w-full h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="time"
              stroke={isDarkMode ? "#475569" : "#cbd5e1"}
              tickLine={false}
              axisLine={false}
              tick={{ fill: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 9, fontWeight: 700 }}
              dy={10}
            />

            <YAxis domain={[minTemp, maxTemp]} hide />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: isDarkMode ? "#334155" : "#e2e8f0", strokeWidth: 1 }} />

            <Area
              type="monotone"
              dataKey="temp"
              stroke="#06b6d4"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorTemp)"
              activeDot={{
                r: 6,
                stroke: isDarkMode ? "#0f172a" : "#ffffff",
                strokeWidth: 2.5,
                fill: "#06b6d4",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick horizontal summaries below the chart */}
      <div className="grid grid-cols-8 text-center mt-3 border-t border-slate-200/50 dark:border-slate-800/40 pt-3">
        {hourlyData.map((item, index) => (
          <div key={index} className="flex flex-col items-center">
            <span className="text-[11px] font-black text-slate-800 dark:text-slate-100">{item.temp}°</span>
            {item.pop > 10 ? (
              <span className="text-[9px] font-black text-cyan-600 dark:text-cyan-400 mt-0.5">{item.pop}%</span>
            ) : (
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">--</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
