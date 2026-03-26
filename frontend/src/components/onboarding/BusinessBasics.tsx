"use client";

import { useState, useEffect } from "react";

const INDUSTRIES = [
  { value: "Grooming", label: "Pet Grooming", desc: "Dog grooming, cat grooming, mobile pet care" },
  { value: "HVAC", label: "HVAC / Heating & Cooling", desc: "AC repair, furnace install, maintenance plans" },
  { value: "Dental", label: "Dental Practice", desc: "Cleanings, exams, cosmetic dentistry" },
  { value: "Cleaning", label: "Cleaning Services", desc: "House cleaning, office cleaning, deep cleans" },
  { value: "Landscaping", label: "Landscaping", desc: "Lawn care, tree trimming, hardscaping" },
  { value: "Salon", label: "Hair Salon / Barber", desc: "Haircuts, coloring, styling, treatments" },
  { value: "Restaurant", label: "Restaurant / Food Service", desc: "Dine-in, takeout, catering, reservations" },
  { value: "Auto Repair", label: "Auto Repair", desc: "Oil changes, brake service, diagnostics" },
  { value: "Other", label: "Other", desc: "Any service business not listed above" },
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
];

function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONES.some((t) => t.value === tz)) return tz;
    // Map common US timezones
    if (tz.includes("Eastern") || tz.includes("New_York")) return "America/New_York";
    if (tz.includes("Central") || tz.includes("Chicago")) return "America/Chicago";
    if (tz.includes("Mountain") || tz.includes("Denver")) return "America/Denver";
    if (tz.includes("Pacific") || tz.includes("Los_Angeles")) return "America/Los_Angeles";
  } catch {}
  return "America/Chicago";
}

interface BusinessBasicsProps {
  onNext: (data: any) => void;
}

export default function BusinessBasics({ onNext }: BusinessBasicsProps) {
  const [form, setForm] = useState({
    business_name: "",
    industry: "",
    phone: "",
    address: "",
    website: "",
    timezone: "America/Chicago",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm((prev) => ({ ...prev, timezone: detectTimezone() }));
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.business_name.trim()) e.business_name = "Required";
    if (!form.industry) e.industry = "Required";
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onNext(form);
  }

  const inputClasses = "w-full min-h-[48px] px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-colors";
  const labelClasses = "block text-sm font-medium text-zinc-300 mb-1.5";

  const selectedIndustry = INDUSTRIES.find((i) => i.value === form.industry);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Tell us about your business</h2>
        <p className="text-zinc-400 mt-1">This helps your AI introduce itself correctly to customers.</p>
      </div>

      <div>
        <label htmlFor="business_name" className={labelClasses}>Business Name</label>
        <input
          id="business_name"
          type="text"
          value={form.business_name}
          onChange={(e) => setForm({ ...form, business_name: e.target.value })}
          placeholder="e.g. Mike's HVAC Services"
          className={inputClasses}
        />
        {errors.business_name && <p className="text-red-400 text-xs mt-1">{errors.business_name}</p>}
      </div>

      <div>
        <label htmlFor="industry" className={labelClasses}>What kind of business do you run?</label>
        <select
          id="industry"
          value={form.industry}
          onChange={(e) => setForm({ ...form, industry: e.target.value })}
          className={inputClasses}
        >
          <option value="">Select your industry</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind.value} value={ind.value}>{ind.label} -- {ind.desc}</option>
          ))}
        </select>
        {errors.industry && <p className="text-red-400 text-xs mt-1">{errors.industry}</p>}
        {selectedIndustry && selectedIndustry.value !== "Other" && (
          <div className="mt-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-200">
              Great! We'll pre-fill common services and FAQs for {selectedIndustry.label.toLowerCase()} businesses. You can customize everything.
            </p>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="phone" className={labelClasses}>
          Phone Number <span className="text-zinc-500 font-normal">-- helps customers find you</span>
        </label>
        <input
          id="phone"
          type="text"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="(555) 123-4567"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="address" className={labelClasses}>
          Business Address <span className="text-zinc-500 font-normal">-- helps customers find you</span>
        </label>
        <input
          id="address"
          type="text"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="123 Main St, Anytown, TX 75001"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="website" className={labelClasses}>
          Website <span className="text-zinc-600">(optional)</span>
        </label>
        <input
          id="website"
          type="text"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="https://www.yourbusiness.com"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="timezone" className={labelClasses}>
          Timezone <span className="text-zinc-500 font-normal">-- auto-detected from your browser</span>
        </label>
        <select
          id="timezone"
          value={form.timezone}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          className={inputClasses}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          className="w-full min-h-[48px] bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-amber-600/20"
        >
          Next: Services & Pricing
        </button>
      </div>
    </form>
  );
}
