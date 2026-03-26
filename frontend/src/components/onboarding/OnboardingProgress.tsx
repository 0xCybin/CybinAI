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
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((label, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0
                    ${isCompleted ? "bg-green-500 text-white" : ""}
                    ${isCurrent ? "bg-transparent border-2 border-blue-500 text-blue-400" : ""}
                    ${!isCompleted && !isCurrent ? "bg-zinc-700 text-zinc-400" : ""}
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
                  className={`mt-1 text-xs text-center hidden sm:block
                    ${isCurrent ? "text-white font-medium" : "text-zinc-500"}
                  `}
                  style={{ maxWidth: "72px" }}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 ${isCompleted ? "bg-green-500" : "bg-zinc-700"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
