import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-14 px-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
        <Icon size={28} className="text-slate-500" strokeWidth={1.5} />
      </div>
      <h3 className="font-display font-semibold text-white text-lg mb-1.5">{title}</h3>
      {description && <p className="text-sm text-slate-400 max-w-sm mb-5 leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}
