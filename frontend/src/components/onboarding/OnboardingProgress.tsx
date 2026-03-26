"use client";

const STEPS = [
  "Business Basics",
  "Services & Pricing",
  "FAQs",
  "Channels",
  "Test Your AI",
  "Go Live",
];

interface OnboardingProgressProps {
  currentStep: number; // 1-based
}

export default function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  const progressPercent = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full mb-10">
      {/* Overall progress bar */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-zinc-400">
          Step {currentStep} of {STEPS.length}
        </span>
        <span className="text-sm font-medium text-amber-500">
          {Math.round(progressPercent)}% complete
        </span>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-2.5 mb-6">
        <div
          className="bg-amber-500 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {STEPS.map((label, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-all duration-300
                    ${isCompleted ? "bg-emerald-500 text-white scale-100" : ""}
                    ${isCurrent ? "bg-amber-500 text-white scale-110 shadow-lg shadow-amber-500/30" : ""}
                    ${!isCompleted && !isCurrent ? "bg-zinc-800 text-zinc-500 border border-zinc-700" : ""}
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                <span
                  className={`mt-2 text-xs text-center hidden sm:block transition-colors duration-300
                    ${isCurrent ? "text-amber-500 font-semibold" : isCompleted ? "text-zinc-400" : "text-zinc-600"}
                  `}
                  style={{ maxWidth: "72px" }}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-colors duration-500 ${isCompleted ? "bg-emerald-500" : "bg-zinc-800"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
