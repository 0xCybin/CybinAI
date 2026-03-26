"use client";

import { useEffect, useState } from "react";

interface Service {
  name: string;
  description: string;
  price_min: string;
  price_max: string;
}

interface ServicesSetupProps {
  onNext: (services: Service[]) => void;
  onBack: () => void;
  defaults?: any[];
  industry?: string;
}

const emptyService = (): Service => ({
  name: "",
  description: "",
  price_min: "",
  price_max: "",
});

export default function ServicesSetup({ onNext, onBack, defaults, industry }: ServicesSetupProps) {
  const [services, setServices] = useState<Service[]>([emptyService()]);
  const [hasDefaults, setHasDefaults] = useState(false);

  useEffect(() => {
    if (defaults && defaults.length > 0) {
      setServices(
        defaults.map((d) => ({
          name: d.name || "",
          description: d.description || "",
          price_min: d.price_min != null ? String(d.price_min) : "",
          price_max: d.price_max != null ? String(d.price_max) : "",
        }))
      );
      setHasDefaults(true);
    }
  }, [defaults]);

  function update(index: number, field: keyof Service, value: string) {
    setServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function addRow() {
    setServices((prev) => [...prev, emptyService()]);
  }

  function removeRow(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const filled = services.filter((s) => s.name.trim());
    onNext(filled);
  }

  const industryLabel = industry ? industry.toLowerCase() : "your industry";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white">Services & Pricing</h2>
        {hasDefaults ? (
          <p className="text-zinc-400 mt-1">
            We've added common {industryLabel} services to get you started. Edit prices to match yours, add or remove as needed.
          </p>
        ) : (
          <p className="text-zinc-400 mt-1">
            Add the services you offer. Your AI will use these to answer pricing questions from customers.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {services.map((service, i) => (
          <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1">Service Name</label>
                <input
                  value={service.name}
                  onChange={(e) => update(i, "name", e.target.value)}
                  placeholder="e.g. Oil Change"
                  className="w-full min-h-[44px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-sm transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="mt-5 min-w-[36px] min-h-[36px] flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors text-sm"
                title="Remove this service"
              >
                Remove
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Description</label>
              <input
                value={service.description}
                onChange={(e) => update(i, "description", e.target.value)}
                placeholder="Brief description of what's included"
                className="w-full min-h-[44px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-sm transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1">Starting Price ($)</label>
                <input
                  type="number"
                  value={service.price_min}
                  onChange={(e) => update(i, "price_min", e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full min-h-[44px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-sm transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1">Up To ($)</label>
                <input
                  type="number"
                  value={service.price_max}
                  onChange={(e) => update(i, "price_max", e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full min-h-[44px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-sm transition-colors"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="w-full min-h-[48px] border-2 border-dashed border-zinc-600 rounded-lg text-amber-500 hover:text-amber-400 hover:border-amber-500/50 transition-colors text-sm font-medium"
      >
        + Add Another Service
      </button>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 min-h-[48px] bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-1 min-h-[48px] bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-amber-600/20"
        >
          Next: FAQs
        </button>
      </div>
    </form>
  );
}
