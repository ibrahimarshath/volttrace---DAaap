"use client";

const STAGES = ["Assembled", "WithOEM", "WithOwner", "WithRecycler", "Closed"];

export default function StageBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 w-full">
      {STAGES.map((stage, i) => (
        <div key={stage} className="flex-1 flex flex-col items-center">
          <div
            className={`w-full h-2 rounded-full ${
              i <= current
                ? i === current
                  ? "bg-volt-500"
                  : "bg-volt-700"
                : "bg-gray-700"
            }`}
          />
          <span
            className={`text-xs mt-1 ${
              i === current ? "text-volt-400 font-semibold" : "text-gray-500"
            }`}
          >
            {stage}
          </span>
        </div>
      ))}
    </div>
  );
}