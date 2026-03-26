"use client";

import { useState } from "react";

const INDUSTRIES = [
  "Grooming",
  "HVAC",
  "Dental",
  "Cleaning",
  "Landscaping",
  "Salon",
  "Restaurant",
  "Auto Repair",
  "Other",
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

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

  function validate() {
    const e: Record<string, string> = {};
    if (!form.business_name.trim()) e.business_name = "Required";
    if (!form.industry) e.industry = "Required";
    if (!form.phone.trim()) e.phone = "Required";
    if (!form.address.trim()) e.address = "Required";
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

  function field(id: keyof typeof form, label: string, type = "text", optional = false) {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-zinc-300 mb-1">
          {label} {optional && <span className="text-zinc-500">(optional)</span>}
        </label>
        <input
          id={id}
          type={type}
          value={form[id]}
          onChange={(e) => setForm({ ...form, [id]: e.target.value })}
          className="w-full min-h-[48px] px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
        />
        {errors[id] && <p className="text-red-400 text-xs mt-1">{errors[id]}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Tell us about your business</h2>
        <p className="text-zinc-400 mt-1">This helps your AI introduce itself correctly to customers.</p>
      </div>

      {field("business_name", "Business Name")}

      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-zinc-300 mb-1">
          Industry
        </label>
        <select
          id="industry"
          value={form.industry}
          onChange={(e) => setForm({ ...form, industry: e.target.value })}
          className="w-full min-h-[48px] px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Select your industry</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
        {errors.industry && <p className="text-red-400 text-xs mt-1">{errors.industry}</p>}
      </div>

      {field("phone", "Phone Number")}
      {field("address", "Business Address")}
      {field("website", "Website", "text", true)}

      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-zinc-300 mb-1">
          Timezone
        </label>
        <select
          id="timezone"
          value={form.timezone}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          className="w-full min-h-[48px] px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
        >
          Next: Services &amp; Pricing
        </button>
      </div>
    </form>
  );
}
