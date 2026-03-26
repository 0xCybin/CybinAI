"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";
import BusinessBasics from "@/components/onboarding/BusinessBasics";
import ServicesSetup from "@/components/onboarding/ServicesSetup";
import FAQBuilder from "@/components/onboarding/FAQBuilder";
import ChannelSetup from "@/components/onboarding/ChannelSetup";
import TestConversation from "@/components/onboarding/TestConversation";
import GoLive from "@/components/onboarding/GoLive";
import {
  getIndustryDefaults,
  saveBusinessInfo,
  saveServices,
  saveFAQs,
  saveChannels,
  completeOnboarding,
} from "@/lib/onboarding-api";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [channels, setChannels] = useState<any>({});
  const [industryDefaults, setIndustryDefaults] = useState<any>(null);

  async function handleBusinessBasics(data: any) {
    setSaving(true);
    setError(null);
    try {
      await saveBusinessInfo(data);
      setBusinessInfo(data);

      try {
        const defaults = await getIndustryDefaults(data.industry);
        setIndustryDefaults(defaults);
      } catch {
        // Industry defaults are best-effort
      }

      setStep(2);
    } catch (err: any) {
      setError("Failed to save business info. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleServices(data: any[]) {
    setSaving(true);
    setError(null);
    try {
      await saveServices(data);
      setServices(data);
      setStep(3);
    } catch {
      setError("Failed to save services. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFAQs(data: any[]) {
    setSaving(true);
    setError(null);
    try {
      await saveFAQs(data);
      setFaqs(data);
      setStep(4);
    } catch {
      setError("Failed to save FAQs. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChannels(data: any) {
    setSaving(true);
    setError(null);
    try {
      await saveChannels(data);
      setChannels(data);
      setStep(5);
    } catch {
      setError("Failed to save channels. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    setSaving(true);
    setError(null);
    try {
      await completeOnboarding();
      router.push("/dashboard");
    } catch {
      setError("Failed to complete setup. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Set up your AI assistant</h1>
          <p className="text-zinc-400 mt-1">Takes about 5 minutes. You can edit everything later.</p>
        </div>

        <OnboardingProgress currentStep={step} />

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {saving && (
          <div className="mb-5 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 text-sm">
            Saving...
          </div>
        )}

        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 sm:p-8">
          {step === 1 && (
            <BusinessBasics onNext={handleBusinessBasics} />
          )}

          {step === 2 && (
            <ServicesSetup
              onNext={handleServices}
              onBack={() => setStep(1)}
              defaults={industryDefaults?.services}
            />
          )}

          {step === 3 && (
            <FAQBuilder
              onNext={handleFAQs}
              onBack={() => setStep(2)}
              defaults={industryDefaults?.faqs}
            />
          )}

          {step === 4 && (
            <ChannelSetup
              onNext={handleChannels}
              onBack={() => setStep(3)}
            />
          )}

          {step === 5 && (
            <TestConversation
              onNext={() => setStep(6)}
              onBack={() => setStep(4)}
              businessName={businessInfo?.business_name}
            />
          )}

          {step === 6 && (
            <GoLive
              data={{ businessInfo, services, faqs, channels }}
              onComplete={handleComplete}
              onBack={() => setStep(5)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
