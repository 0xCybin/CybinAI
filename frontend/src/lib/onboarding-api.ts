import { getAccessToken } from './api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function onboardingRequest(path: string, options: RequestInit = {}) {
  const token = getAccessToken() || localStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}/api/v1/onboarding${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`Onboarding API error: ${res.status}`);
  return res.json();
}

export async function getIndustryDefaults(industry: string) {
  return onboardingRequest(`/industry-defaults/${industry}`);
}

export async function saveBusinessInfo(data: any) {
  return onboardingRequest("/business-info", { method: "POST", body: JSON.stringify(data) });
}

export async function saveServices(services: any[]) {
  return onboardingRequest("/services", { method: "POST", body: JSON.stringify({ services }) });
}

export async function saveFAQs(items: any[]) {
  return onboardingRequest("/faq", { method: "POST", body: JSON.stringify({ items }) });
}

export async function saveChannels(data: any) {
  return onboardingRequest("/channels", { method: "POST", body: JSON.stringify(data) });
}

export async function completeOnboarding() {
  return onboardingRequest("/complete", { method: "POST" });
}
