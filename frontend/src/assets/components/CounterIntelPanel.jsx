import { Radar, Bot, ShieldAlert } from 'lucide-react';

// Level-2 "5-Layer Counter-Intelligence Shield" breakdown for an AI report.
const barColor = (score) =>
  score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-emerald-500';

const verdictStyle = {
  HOSTILE: 'bg-red-500/20 text-red-400 border-red-500/40',
  HIGH_RISK: 'bg-red-500/15 text-red-300 border-red-500/30',
  SUSPICIOUS: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  CLEAR: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
};

export default function CounterIntelPanel({ report }) {
  const ci = report?.counter_intel;
  if (!ci || !Array.isArray(ci.layers)) return null;

  return (
    <div className="mt-2 pt-4 border-t border-slate-800 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 font-tactical">
          <Radar className="w-3.5 h-3.5" />
          <span>Level-2: 5-Layer Counter-Intelligence Shield</span>
        </h4>
        <div className="flex items-center gap-2">
          {ci.humanised_ai_bot_suspected && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border font-mono bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40 flex items-center gap-1">
              <Bot className="w-3 h-3" /> HUMANISED AI BOT SUSPECTED
            </span>
          )}
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border font-mono ${verdictStyle[ci.verdict] || verdictStyle.CLEAR}`}>
            {ci.verdict} · {Math.round(ci.counter_intel_score)}%
          </span>
        </div>
      </div>

      <div className="grid gap-2">
        {ci.layers.map((layer) => (
          <div key={layer.layer} className="bg-slate-900/70 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-200 font-bold">
                L{layer.layer} · {layer.name}
              </span>
              <span className={layer.status !== 'ok' ? 'text-slate-500' : 'text-slate-400'}>
                {layer.status !== 'ok' ? 'DEGRADED' : `${layer.verdict.replaceAll('_', ' ')} · ${Math.round(layer.score)}%`}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className={`h-full ${barColor(layer.score)}`} style={{ width: `${Math.max(2, layer.score)}%` }} />
            </div>
            {layer.signals?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {layer.signals.slice(0, 4).map((s) => (
                  <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {s.replaceAll('_', ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {ci.primary_intent && ci.primary_intent !== 'benign_social' && (
        <div className="text-xs text-slate-300 flex items-center gap-2 font-mono">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Assessed intent: {ci.primary_intent.replaceAll('_', ' ')}</span>
        </div>
      )}
    </div>
  );
}
