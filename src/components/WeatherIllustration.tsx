import { motion } from "motion/react";

interface WeatherIllustrationProps {
  condition: string;
  className?: string;
}

export default function WeatherIllustration({ condition, className = "" }: WeatherIllustrationProps) {
  const normalized = condition.toLowerCase();

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  // 1. STORM WITH RAIN / THUNDERSTORM
  if (normalized.includes("storm") || normalized.includes("thunder") || normalized.includes("lightning")) {
    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className={`relative flex items-center justify-center ${className}`}
        id="illustration-storm"
      >
        {/* Storm Cloud Layer Back */}
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          className="w-48 h-48 drop-shadow-[0_10px_25px_rgba(50,50,50,0.5)] dark:drop-shadow-[0_15px_35px_rgba(0,0,0,0.8)] filter"
        >
          {/* Base Cloud Outline */}
          <motion.path
            d="M20,60 C15,60 10,55 10,48 C10,41 15,36 21,36 C24,25 34,18 45,18 C57,18 67,27 69,38 C75,38 80,43 80,49 C80,55 75,60 69,60 Z"
            fill="url(#storm-cloud-grad)"
            animate={{
              y: [0, -3, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Glowing lightning bolt inside */}
          <motion.path
            d="M48,32 L35,52 L45,52 L38,75 L58,48 L48,48 Z"
            fill="url(#lightning-grad)"
            animate={{
              opacity: [0.3, 1, 0.3, 0.4, 1, 0.3],
              scale: [0.95, 1.05, 0.95, 0.98, 1.05, 0.95],
              filter: ["drop-shadow(0px 0px 4px #FBBF24)", "drop-shadow(0px 0px 18px #FBBF24)"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <defs>
            <linearGradient id="storm-cloud-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="lightning-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
          </defs>
        </motion.svg>
      </motion.div>
    );
  }

  // 2. SUNNY / CLEAR
  if (normalized.includes("clear") || normalized.includes("sun") || normalized.includes("fair")) {
    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className={`relative flex items-center justify-center ${className}`}
        id="illustration-clear"
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          className="w-48 h-48 drop-shadow-[0_15px_30px_rgba(245,158,11,0.25)] dark:drop-shadow-[0_20px_45px_rgba(245,158,11,0.15)]"
        >
          {/* Outer Rays Glow */}
          <motion.circle
            cx="50"
            cy="50"
            r="28"
            fill="rgba(245,158,11,0.15)"
            animate={{
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Rotating Sun Rays */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          >
            {[...Array(8)].map((_, i) => (
              <line
                key={i}
                x1="50"
                y1="12"
                x2="50"
                y2="20"
                stroke="#F59E0B"
                strokeWidth="4"
                strokeLinecap="round"
                transform={`rotate(${i * 45} 50 50)`}
              />
            ))}
          </motion.g>

          {/* Central Sun */}
          <motion.circle
            cx="50"
            cy="50"
            r="22"
            fill="url(#sun-grad)"
            animate={{
              scale: [0.97, 1.03, 0.97],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <defs>
            <linearGradient id="sun-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FCD34D" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
        </motion.svg>
      </motion.div>
    );
  }

  // 3. SNOW / WINTER
  if (normalized.includes("snow") || normalized.includes("freeze") || normalized.includes("ice") || normalized.includes("blizzard")) {
    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className={`relative flex items-center justify-center ${className}`}
        id="illustration-snow"
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          className="w-48 h-48 drop-shadow-[0_10px_20px_rgba(186,230,253,0.3)]"
        >
          {/* Cloud base */}
          <motion.path
            d="M20,55 C15,55 10,50 10,43 C10,36 15,31 21,31 C24,20 34,13 45,13 C57,13 67,22 69,33 C75,33 80,38 80,44 C80,50 75,55 69,55 Z"
            fill="url(#snow-cloud-grad)"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Animated falling snowflakes */}
          <motion.g>
            {[
              { cx: 28, cy: 68, r: 2.5, delay: 0 },
              { cx: 42, cy: 75, r: 3.5, delay: 0.5 },
              { cx: 58, cy: 67, r: 2.5, delay: 1.1 },
              { cx: 68, cy: 74, r: 3, delay: 0.3 },
            ].map((flake, idx) => (
              <motion.circle
                key={idx}
                cx={flake.cx}
                cy={flake.cy}
                r={flake.r}
                fill="#E0F2FE"
                animate={{
                  y: [0, 15, 0],
                  opacity: [0.2, 0.9, 0.2],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: flake.delay,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.g>

          <defs>
            <linearGradient id="snow-cloud-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
        </motion.svg>
      </motion.div>
    );
  }

  // 4. RAIN / DRIZZLE / SHOWERS
  if (normalized.includes("rain") || normalized.includes("drizzle") || normalized.includes("shower")) {
    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className={`relative flex items-center justify-center ${className}`}
        id="illustration-rain"
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          className="w-48 h-48 drop-shadow-[0_12px_24px_rgba(59,130,246,0.25)]"
        >
          {/* Cloud Base */}
          <motion.path
            d="M20,55 C15,55 10,50 10,43 C10,36 15,31 21,31 C24,20 34,13 45,13 C57,13 67,22 69,33 C75,33 80,38 80,44 C80,50 75,55 69,55 Z"
            fill="url(#rain-cloud-grad)"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Falling drops */}
          <motion.g>
            {[
              { d: "M 28,65 L 25,78", delay: 0 },
              { d: "M 42,68 L 39,83", delay: 0.4 },
              { d: "M 56,66 L 53,80", delay: 0.8 },
              { d: "M 68,64 L 65,77", delay: 0.2 },
            ].map((drop, idx) => (
              <motion.path
                key={idx}
                d={drop.d}
                stroke="url(#rain-drop-grad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                animate={{
                  y: [0, 8, 0],
                  opacity: [0.1, 1, 0.1],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: drop.delay,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.g>

          <defs>
            <linearGradient id="rain-cloud-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="rain-drop-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
          </defs>
        </motion.svg>
      </motion.div>
    );
  }

  // 5. CLOUDY / PARTLY CLOUDY (DEFAULT FALLBACK)
  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className={`relative flex items-center justify-center ${className}`}
      id="illustration-cloudy"
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        className="w-48 h-48 drop-shadow-[0_12px_24px_rgba(100,116,139,0.2)] dark:drop-shadow-[0_15px_30px_rgba(0,0,0,0.4)]"
      >
        {/* Behind Sun Glow if partly cloudy */}
        {normalized.includes("part") && (
          <motion.circle
            cx="65"
            cy="32"
            r="16"
            fill="url(#part-sun-grad)"
            animate={{
              scale: [0.95, 1.05, 0.95],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Main cloud */}
        <motion.path
          d="M20,60 C15,60 10,55 10,48 C10,41 15,36 21,36 C24,25 34,18 45,18 C57,18 67,27 69,38 C75,38 80,43 80,49 C80,55 75,60 69,60 Z"
          fill="url(#cloudy-main-grad)"
          animate={{
            y: [0, -3, 0],
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <defs>
          <linearGradient id="part-sun-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          <linearGradient id="cloudy-main-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>
      </motion.svg>
    </motion.div>
  );
}
