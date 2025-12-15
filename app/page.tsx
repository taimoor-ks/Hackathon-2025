"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MoodData {
  mood_score: number;
  mood_label: "Chaos" | "Stressed" | "Neutral" | "Good" | "Vibes";
  summary: string;
  positive_signals: string[];
  negative_signals: string[];
  top_emojis: string[];
  playlist: {
    name: string;
    url: string;
  };
  sample_size: number;
  generated_at: string;
}

export default function Home() {
  const [data, setData] = useState<MoodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cursorTrail, setCursorTrail] = useState<
    Array<{ x: number; y: number; id: number }>
  >([]);
  const [emojiRain, setEmojiRain] = useState<
    Array<{ x: number; y: number; emoji: string; id: number }>
  >([]);
  const trailIdRef = useRef(0);

  const fetchMood = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/mood");
      const json = await res.json();

      if (json.error) {
        setError(json.error);
      } else {
        const prevScore = data?.mood_score;
        setData(json);

        // Trigger confetti for high mood scores
        if (json.mood_score >= 80) {
          triggerConfetti();
        }

        // Trigger emoji rain for low mood scores or on initial load
        if (
          json.mood_score <= 30 &&
          (!prevScore || prevScore !== json.mood_score)
        ) {
          triggerEmojiRain(json.top_emojis);
        }

        // Trigger emoji rain on mood changes
        if (
          prevScore &&
          prevScore !== json.mood_score &&
          json.mood_score > 30 &&
          json.mood_score < 80
        ) {
          triggerEmojiRain(json.top_emojis);
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMood();
  }, []);

  // Confetti effect for high mood
  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  // Emoji rain effect
  const triggerEmojiRain = (emojis: string[]) => {
    const newRain = Array.from({ length: 15 }, (_, i) => ({
      x: Math.random() * 100,
      y: -10 - Math.random() * 50,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      id: Date.now() + i,
    }));
    setEmojiRain(newRain);
    setTimeout(() => setEmojiRain([]), 4000);
  };

  // Cursor trail effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const newTrail = {
        x: e.clientX,
        y: e.clientY,
        id: trailIdRef.current++,
      };
      setCursorTrail((prev) => [...prev.slice(-8), newTrail]);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const getMoodColor = (label: string) => {
    const colors: Record<string, string> = {
      Chaos: "text-red-500",
      Stressed: "text-orange-500",
      Neutral: "text-yellow-500",
      Good: "text-green-500",
      Vibes: "text-blue-500",
    };
    return colors[label] || "text-gray-500";
  };

  const getMoodBgColor = (label: string) => {
    const colors: Record<string, string> = {
      Chaos: "bg-red-100",
      Stressed: "bg-orange-100",
      Neutral: "bg-yellow-100",
      Good: "bg-green-100",
      Vibes: "bg-blue-100",
    };
    return colors[label] || "bg-gray-100";
  };

  const getHeartbeatSpeed = (score: number) => {
    if (score < 20) return 0.5;
    if (score < 40) return 0.7;
    if (score < 60) return 1.0;
    if (score < 80) return 1.3;
    return 1.5;
  };

  const getPulseIntensity = (label: string) => {
    const intensity: Record<string, number> = {
      Chaos: 2,
      Stressed: 1.5,
      Neutral: 1,
      Good: 1.2,
      Vibes: 1.8,
    };
    return intensity[label] || 1;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700">{error}</p>
          <p className="text-sm text-gray-500 mt-4">
            Make sure your .env.local file has the correct Slack and OpenAI
            credentials.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const chartData = [{ name: "Mood Score", value: data.mood_score }];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Cursor trail effect */}
      {cursorTrail.map((trail, i) => (
        <motion.div
          key={trail.id}
          className="fixed w-3 h-3 rounded-full bg-purple-400 pointer-events-none z-50"
          style={{
            left: trail.x,
            top: trail.y,
            transform: "translate(-50%, -50%)",
          }}
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}

      {/* Emoji rain effect */}
      {emojiRain.map((drop) => (
        <motion.div
          key={drop.id}
          className="fixed text-4xl pointer-events-none z-40"
          style={{
            left: `${drop.x}%`,
            top: `${drop.y}%`,
          }}
          initial={{ y: "-10vh", opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", opacity: 0, rotate: 360 }}
          transition={{ duration: 3 + Math.random() * 2, ease: "linear" }}
        >
          {drop.emoji}
        </motion.div>
      ))}

      {/* Animated background orbs */}
      <motion.div
        className="absolute top-20 left-20 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        animate={{
          x: [0, -100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto relative z-10"
      >
        <motion.div variants={itemVariants}>
          <motion.h1
            className="text-5xl md:text-6xl font-black text-center mb-3 bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 bg-clip-text text-transparent drop-shadow-2xl"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
            style={{ letterSpacing: "-0.02em" }}
          >
            Office Mood Tracker 🎵
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl font-bold text-center text-gray-700 mb-2"
            variants={itemVariants}
          >
            Your Team&apos;s Vibe, Visualized
          </motion.p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex items-center justify-center gap-4 mb-8"
        >
          <p className="text-center text-lg font-semibold text-gray-700">
            📊 {data.sample_size} messages analyzed in the last 24 hours
          </p>
          <motion.button
            onClick={fetchMood}
            disabled={isRefreshing}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-full text-lg font-bold shadow-2xl disabled:opacity-50"
            whileHover={{
              scale: 1.1,
              boxShadow: "0 20px 60px rgba(139, 92, 246, 0.4)",
            }}
            whileTap={{ scale: 0.95 }}
            animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={
              isRefreshing
                ? { duration: 1, repeat: Infinity, ease: "linear" }
                : { duration: 0.3 }
            }
          >
            {isRefreshing ? "🔄" : "↻"} Refresh Mood
          </motion.button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <motion.div
            variants={itemVariants}
            whileHover={{
              scale: 1.02,
              transition: { duration: 0.2 },
            }}
            className={`${getMoodBgColor(
              data.mood_label
            )} p-8 rounded-2xl shadow-lg relative overflow-hidden`}
          >
            {/* Pulse ring animation */}
            <motion.div
              className="absolute inset-0 rounded-2xl border-4 border-purple-500 opacity-20"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 2 / getHeartbeatSpeed(data.mood_score),
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            <h2 className="text-2xl font-bold mb-4 text-gray-800 relative z-10">
              🎯 Current Mood
            </h2>

            {/* Heartbeat animated emoji/icon */}
            <motion.div
              className="flex items-center justify-center mb-4"
              animate={{
                scale: [1, 1.15, 1],
              }}
              transition={{
                duration: 1 / getHeartbeatSpeed(data.mood_score),
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div
                className={`text-6xl md:text-7xl font-black ${getMoodColor(
                  data.mood_label
                )} drop-shadow-lg`}
              >
                {data.mood_label}
              </div>
            </motion.div>

            {/* Circular progress indicator */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg className="transform -rotate-90 w-32 h-32">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    className="text-gray-300"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    strokeLinecap="round"
                    className={getMoodColor(data.mood_label).replace(
                      "text-",
                      "stroke-"
                    )}
                    initial={{ strokeDasharray: "0 352" }}
                    animate={{
                      strokeDasharray: `${(data.mood_score / 100) * 352} 352`,
                    }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="text-4xl font-black text-gray-800"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {data.mood_score}
                  </motion.div>
                </div>
              </div>
            </div>

            <p className="text-lg font-medium text-gray-700 relative z-10 leading-relaxed">
              {data.summary}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-8 rounded-2xl shadow-lg relative overflow-hidden"
          >
            {/* Floating emoji particles */}
            {data.top_emojis.slice(0, 3).map((emoji, i) => (
              <motion.div
                key={i}
                className="absolute text-4xl opacity-20"
                initial={{ y: 100, x: Math.random() * 300 }}
                animate={{
                  y: -100,
                  x: Math.random() * 300,
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 8 + Math.random() * 4,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 2,
                }}
              >
                {emoji}
              </motion.div>
            ))}

            <h2 className="text-2xl font-bold mb-4 text-gray-800 relative z-10">
              📈 Mood Visualization
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  style={{ fontSize: "14px", fontWeight: "bold" }}
                />
                <YAxis
                  domain={[0, 100]}
                  style={{ fontSize: "14px", fontWeight: "bold" }}
                />
                <Tooltip
                  contentStyle={{ fontSize: "16px", fontWeight: "bold" }}
                />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                🔥 Top Emojis
              </h3>
              <div className="flex gap-3 flex-wrap justify-center">
                {data.top_emojis.map((emoji, i) => (
                  <motion.div
                    key={i}
                    className="text-4xl"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      delay: 0.5 + i * 0.1,
                      type: "spring",
                      stiffness: 200,
                    }}
                    whileHover={{ scale: 1.3, rotate: 15 }}
                  >
                    {emoji}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-green-50 p-8 rounded-2xl shadow-lg relative overflow-hidden"
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-300 to-transparent"
              animate={{ x: [-200, 400] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />

            <h2 className="text-2xl font-bold mb-4 text-green-800">
              ✨ Positive Signals
            </h2>
            <ul className="space-y-3">
              {data.positive_signals.map((signal, i) => (
                <motion.li
                  key={i}
                  className="flex items-start"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  whileHover={{ x: 10, transition: { duration: 0.2 } }}
                >
                  <motion.span
                    className="text-2xl text-green-600 mr-2"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      delay: 0.6 + i * 0.1,
                      duration: 0.5,
                    }}
                  >
                    ✓
                  </motion.span>
                  <span className="text-base font-medium text-gray-700 leading-relaxed pt-1">
                    {signal}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-red-50 p-8 rounded-2xl shadow-lg relative overflow-hidden"
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-300 to-transparent"
              animate={{ x: [-200, 400] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
                delay: 1,
              }}
            />

            <h2 className="text-2xl font-bold mb-4 text-red-800">
              ⚠️ Areas to Watch
            </h2>
            <ul className="space-y-3">
              {data.negative_signals.map((signal, i) => (
                <motion.li
                  key={i}
                  className="flex items-start"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  whileHover={{ x: 10, transition: { duration: 0.2 } }}
                >
                  <motion.span
                    className="text-2xl text-red-600 mr-2"
                    animate={{
                      rotate: [0, -10, 10, -10, 0],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      delay: 0.7 + i * 0.1,
                      duration: 0.5,
                    }}
                  >
                    ⚠
                  </motion.span>
                  <span className="text-base font-medium text-gray-700 leading-relaxed pt-1">
                    {signal}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-purple-100 via-pink-50 to-blue-100 p-8 rounded-3xl shadow-2xl text-center border-2 border-purple-200"
        >
          <h2 className="text-3xl font-black mb-4 bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 bg-clip-text text-transparent">
            🎧 Recommended Playlist
          </h2>
          <p className="text-2xl font-bold mb-6 text-gray-800">
            {data.playlist.name}
          </p>
          <motion.a
            href={data.playlist.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#1DB954] text-white px-8 py-4 rounded-full text-lg font-black hover:bg-[#1ed760] transition-colors shadow-xl"
            whileHover={{
              scale: 1.1,
              boxShadow: "0 20px 60px rgba(29, 185, 84, 0.4)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Open in Spotify
          </motion.a>
        </motion.div>

        <motion.p
          variants={itemVariants}
          className="text-center text-gray-600 text-base font-semibold mt-6"
        >
          📅 Generated at {new Date(data.generated_at).toLocaleString()}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
