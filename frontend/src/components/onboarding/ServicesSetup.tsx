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
}

const emptyService = (): Service => ({
  name: "",
  description: "",
  price_min: "",
  price_max: "",
});

export default function ServicesSetup({ onNext, onBack, defaults }: ServicesSetupProps) {
  const [services, setServices] = useState<Service[]>([emptyService()]);

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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Services &amp; Pricing</h2>
        <p className="text-zinc-400 mt-1">
          These are suggestions based on your industry. Edit, add, or remove as needed.
        </p>
      </div>

      <div className="space-y-4">
        {services.map((service, i) => (
          <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-3">
            <div className="flex gap-3">
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
                className="self-end min-h-[44px] px-3 text-zinc-500 hover:text-red-400 transition-colors text-lg"
                title="Remove"
              >
                ×
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Description</label>
              <input
                value={service.description}
                onChange={(e) => update(i, "description", e.target.value)}
                placeholder="Brief description"
                className="w-full min-h-[44px] px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1">Min Price ($)</label>
                <input
                  type="number"
                  value={service.price_min}
                  onChange={(e) => update(i, "price_min", e.target.value)}
                  placeholder="0"
                  className="w-full min-h-[44px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-sm transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1">Max Price ($)</label>
                <input
                  type="number"
                  value={service.price_max}
                  onChange={(e) => update(i, "price_max", e.target.value)}
                  placeholder="0"
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
        className="w-full min-h-[44px] border border-dashed border-zinc-600 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-400 transition-colors text-sm"
      >
        + Add Service
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
