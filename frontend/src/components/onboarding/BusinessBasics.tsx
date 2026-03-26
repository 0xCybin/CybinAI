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

  const inputClasses = "w-full min-h-[48px] px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-colors";
  const labelClasses = "block text-sm font-medium text-zinc-300 mb-1.5";

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
        <label htmlFor="industry" className={labelClasses}>Industry</label>
        <select
          id="industry"
          value={form.industry}
          onChange={(e) => setForm({ ...form, industry: e.target.value })}
          className={inputClasses}
        >
          <option value="">Select your industry</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
        {errors.industry && <p className="text-red-400 text-xs mt-1">{errors.industry}</p>}
      </div>

      <div>
        <label htmlFor="phone" className={labelClasses}>Phone Number</label>
        <input
          id="phone"
          type="text"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="(555) 123-4567"
          className={inputClasses}
        />
        {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
      </div>

      <div>
        <label htmlFor="address" className={labelClasses}>Business Address</label>
        <input
          id="address"
          type="text"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="123 Main St, Anytown, TX 75001"
          className={inputClasses}
        />
        {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address}</p>}
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
        <label htmlFor="timezone" className={labelClasses}>Timezone</label>
        <select
          id="timezone"
          value={form.timezone}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          className={inputClasses}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
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
