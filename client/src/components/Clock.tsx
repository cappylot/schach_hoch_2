interface ClockProps {
  label: string;
  millis: number;
  active?: boolean;
}

const formatTime = (millis: number) => {
  const clamped = Math.max(0, millis);
  const seconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const tenths =
    clamped < 20_000 ? Math.floor((clamped % 1000) / 100) : 0;
  const base = `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`;
  return tenths > 0 ? `${base}.${tenths}` : base;
};

export const Clock = ({ label, millis, active }: ClockProps) => {
  return (
    <div
      className={`flex flex-col items-center rounded-md border border-slate-700 px-3 py-2 text-sm ${
        active ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-800'
      }`}
    >
      <span className="uppercase tracking-wide text-xs text-slate-400">
        {label}
      </span>
      <span className="text-xl font-semibold tabular-nums">
        {formatTime(millis)}
      </span>
    </div>
  );
};
