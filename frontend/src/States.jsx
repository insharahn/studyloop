// src/States.jsx
import { cn } from "./utils";

export function SkeletonBlock({ className }) {
  return (
    <div className={cn("animate-pulse border-2 border-white/10 bg-white/5", className)} />
  );
}

export function EmptyState({ icon: Icon, title, description, actionText, onAction }) {
  return (
    <div className="rounded-[28px] border-4 border-dashed border-white/20 bg-white/5 p-12 text-center">
      {Icon && <Icon className="mx-auto h-12 w-12 text-white/40 mb-3" />}
      <h3 className="font-display text-2xl uppercase">{title}</h3>
      <p className="mt-1 text-xs font-bold text-white/60 max-w-md mx-auto">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-xl border-2 border-[#171717] bg-[#ffd356] px-5 py-2.5 text-xs font-black uppercase text-[#171717] shadow-hard hover:bg-amber-300 transition"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
