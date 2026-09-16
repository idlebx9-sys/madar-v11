import { cn } from "@/lib/utils";

type Status =
  | "published"
  | "draft"
  | "unpublished"
  | "active"
  | "inactive"
  | "pending"
  | "verified"
  | "failed"
  | "suspended";

const statusConfig: Record<
  Status,
  { label: string; className: string; dot?: string }
> = {
  published: {
    label: "منشور",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  draft: {
    label: "مسودة",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
  },
  unpublished: {
    label: "غير منشور",
    className: "bg-slate-500/15 text-slate-400 border-slate-500/20",
    dot: "bg-slate-400",
  },
  active: {
    label: "نشط",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  inactive: {
    label: "متوقف",
    className: "bg-red-500/15 text-red-400 border-red-500/20",
    dot: "bg-red-400",
  },
  pending: {
    label: "قيد التحقق",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
  },
  verified: {
    label: "تم التحقق",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  failed: {
    label: "فشل",
    className: "bg-red-500/15 text-red-400 border-red-500/20",
    dot: "bg-red-400",
  },
  suspended: {
    label: "موقوف",
    className: "bg-red-500/15 text-red-400 border-red-500/20",
    dot: "bg-red-400",
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const key = (status?.toLowerCase() || "draft") as Status;
  const config = statusConfig[key] || statusConfig.draft;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {showDot && <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />}
      {config.label}
    </span>
  );
}
