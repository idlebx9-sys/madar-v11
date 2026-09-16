import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: number;
  color?: string;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  change,
  color = "#D4AF37",
  loading,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <div className={cn("rounded-2xl p-5 border border-white/5 bg-white/[0.03] animate-pulse", className)}>
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/10" />
          <div className="w-12 h-4 rounded bg-white/10" />
        </div>
        <div className="h-8 w-20 rounded bg-white/10 mb-2" />
        <div className="h-4 w-24 rounded bg-white/10" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5 border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm",
        "hover:border-[#D4AF37]/25 hover:bg-white/[0.05] transition-all duration-300",
        className
      )}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${color}08, transparent 40%)`,
        }}
      />
      <div className="relative flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
          style={{ background: `${color}18` }}
        >
          <Icon size={18} style={{ color }} strokeWidth={1.75} />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full",
              change >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"
            )}
          >
            {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="relative font-display text-2xl font-bold text-white tracking-tight mb-1 tabular-nums">
        {value}
      </div>
      <div className="relative text-sm text-slate-400">{label}</div>
    </motion.div>
  );
}
