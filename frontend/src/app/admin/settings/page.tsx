'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/lib/api';
import {
  ArrowLeft,
  Building2,
  Palette,
  Bot,
  Bell,
  Save,
  Loader2,
  Check,
  Clock,
  Globe,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
} from 'lucide-react';

const API_URL = 'http://localhost:8000';

// =============================================================================
// Types
// =============================================================================

interface BusinessHoursEntry {
  day: string;
  enabled: boolean;
  open_time: string;
  close_time: string;
}

interface BusinessProfile {
  name: string;
  subdomain: string;
  custom_domain: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  timezone: string;
  business_hours: BusinessHoursEntry[];
  created_at: string;
  updated_at: string;
}

interface WidgetSettings {
  colors: {
    primary_color: string;
    secondary_color: string;
    background_color: string;
    text_color: string;
  };
  messages: {
    welcome_message: string;
    offline_message: string;
    placeholder_text: string;
    away_message: string;
  };
  features: {
    show_branding: boolean;
    collect_email: boolean;
    collect_phone: boolean;
    collect_name: boolean;
    require_email: boolean;
    show_powered_by: boolean;
    enable_attachments: boolean;
    enable_emoji: boolean;
    show_agent_avatars: boolean;
    enable_sound_notifications: boolean;
  };
  position: {
    position: string;
    offset_x: number;
    offset_y: number;
  };
}

interface AISettings {
  enabled: boolean;
  response_style: string;
  escalation_threshold: number;
  max_ai_turns: number;
  auto_resolve_enabled: boolean;
  auto_resolve_hours: number;
  greeting_enabled: boolean;
  custom_instructions: string | null;
}

interface NotificationSettings {
  email_new_conversation: boolean;
  email_escalation: boolean;
  email_daily_digest: boolean;
  email_weekly_report: boolean;
  notification_email: string | null;
  slack_webhook_url: string | null;
  slack_enabled: boolean;
}

interface AllSettings {
  business_profile: BusinessProfile;
  widget: WidgetSettings;
  ai: AISettings;
  notifications: NotificationSettings;
}

type TabId = 'profile' | 'widget' | 'ai' | 'notifications';

// =============================================================================
// Main Component
// =============================================================================

export default function SettingsPage() {
  const { isLoading: authLoading } = useAuth();
  const { isAuthenticated } = useRequireAuth();

  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [settings, setSettings] = useState<AllSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch all settings
  const fetchSettings = useCallback(async () => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to fetch settings');
      }

      const data = await res.json();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    }
  }, [isAuthenticated, fetchSettings]);

  // Save handler for each section
  const saveSettings = async (section: string, data: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/settings/${section}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to save settings');
      }

      // Refresh settings
      await fetchSettings();
      setSuccessMessage('Settings saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (authLoading || !isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-[#1A1915] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-[#1A1915] flex items-center justify-center">
        <p className="text-red-400">{error || 'Failed to load settings'}</p>
      </div>
    );
  }

  const tabs = [
    { id: 'profile' as TabId, label: 'Business Profile', icon: Building2 },
    { id: 'widget' as TabId, label: 'Chat Widget', icon: Palette },
    { id: 'ai' as TabId, label: 'AI Settings', icon: Bot },
    { id: 'notifications' as TabId, label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-[#1A1915] text-white">
      {/* Header */}
      <header className="bg-[#131210] border-b border-neutral-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft size={20} className="text-neutral-400" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Settings</h1>
            <p className="text-sm text-neutral-500">
              Configure your business and chat widget
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="max-w-6xl mx-auto px-6 pt-4">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
            <Check size={16} />
            {successMessage}
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <nav className="w-56 flex-shrink-0">
            <div className="bg-[#232220] rounded-xl border border-neutral-800 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    activeTab === tab.id
                      ? 'bg-amber-600/20 text-amber-400'
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                  }`}
                >
                  <tab.icon size={20} />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Tab Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <BusinessProfileTab
                data={settings.business_profile}
                onSave={(data) => saveSettings('business-profile', data)}
                saving={saving}
              />
            )}
            {activeTab === 'widget' && (
              <WidgetSettingsTab
                data={settings.widget}
                businessName={settings.business_profile.name}
                onSave={(data) => saveSettings('widget', data)}
                saving={saving}
              />
            )}
            {activeTab === 'ai' && (
              <AISettingsTab
                data={settings.ai}
                onSave={(data) => saveSettings('ai', data)}
                saving={saving}
              />
            )}
            {activeTab === 'notifications' && (
              <NotificationSettingsTab
                data={settings.notifications}
                onSave={(data) => saveSettings('notifications', data)}
                saving={saving}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// =============================================================================
// Business Profile Tab
// =============================================================================

function BusinessProfileTab({
  data,
  onSave,
  saving,
}: {
  data: BusinessProfile;
  onSave: (data: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: data.name,
    logo_url: data.logo_url || '',
    phone: data.phone || '',
    email: data.email || '',
    website: data.website || '',
    address: data.address || '',
    timezone: data.timezone,
  });

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
    'UTC',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="bg-[#232220] rounded-xl border border-neutral-800">
      <div className="p-6 border-b border-neutral-800">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="text-amber-500" size={20} />
          Business Profile
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Your business information displayed to customers
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Business Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
            placeholder="Your Business Name"
          />
        </div>

        {/* Subdomain (read-only) */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Subdomain
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={data.subdomain}
              disabled
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2.5 text-neutral-500 cursor-not-allowed"
            />
            <span className="text-neutral-500 text-sm">.MykoDesk.com</span>
          </div>
          <p className="text-xs text-neutral-600 mt-1">
            Contact support to change your subdomain
          </p>
        </div>

        {/* Logo URL */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Logo URL
          </label>
          <input
            type="url"
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
            placeholder="https://example.com/logo.png"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              <Phone size={14} className="inline mr-1" />
              Phone
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              <Mail size={14} className="inline mr-1" />
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
              placeholder="contact@example.com"
            />
          </div>
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            <ExternalLink size={14} className="inline mr-1" />
            Website
          </label>
          <input
            type="url"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
            placeholder="https://example.com"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            <MapPin size={14} className="inline mr-1" />
            Address
          </label>
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            rows={2}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 resize-none"
            placeholder="123 Main St, City, State 12345"
          />
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            <Globe size={14} className="inline mr-1" />
            Timezone
          </label>
          <select
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-neutral-800">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

// =============================================================================
// Widget Settings Tab
// =============================================================================

function WidgetSettingsTab({
  data,
  businessName,
  onSave,
  saving,
}: {
  data: WidgetSettings;
  businessName: string;
  onSave: (data: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [colors, setColors] = useState(data.colors);
  const [messages, setMessages] = useState(data.messages);
  const [features, setFeatures] = useState(data.features);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ colors, messages, features });
  };

  return (
    <div className="space-y-6">
      {/* Colors Section */}
      <div className="bg-[#232220] rounded-xl border border-neutral-800">
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="text-amber-500" size={20} />
            Widget Colors
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Customize the look of your chat widget
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Primary Color */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.primary_color}
                  onChange={(e) =>
                    setColors({ ...colors, primary_color: e.target.value })
                  }
                  className="w-12 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={colors.primary_color}
                  onChange={(e) =>
                    setColors({ ...colors, primary_color: e.target.value })
                  }
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Secondary Color */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Secondary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.secondary_color}
                  onChange={(e) =>
                    setColors({ ...colors, secondary_color: e.target.value })
                  }
                  className="w-12 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={colors.secondary_color}
                  onChange={(e) =>
                    setColors({ ...colors, secondary_color: e.target.value })
                  }
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Background Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.background_color}
                  onChange={(e) =>
                    setColors({ ...colors, background_color: e.target.value })
                  }
                  className="w-12 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={colors.background_color}
                  onChange={(e) =>
                    setColors({ ...colors, background_color: e.target.value })
                  }
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Text Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.text_color}
                  onChange={(e) =>
                    setColors({ ...colors, text_color: e.target.value })
                  }
                  className="w-12 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={colors.text_color}
                  onChange={(e) =>
                    setColors({ ...colors, text_color: e.target.value })
                  }
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Widget Preview */}
          <div className="mt-8">
            <label className="block text-sm font-medium text-neutral-300 mb-3">
              Preview
            </label>
            <div className="bg-neutral-900 rounded-xl p-6 flex items-center justify-center min-h-[200px]">
              <WidgetPreview
                colors={colors}
                messages={messages}
                businessName={businessName}
              />
            </div>
          </div>

          {/* Messages Section */}
          <div className="mt-8 pt-6 border-t border-neutral-800">
            <h3 className="text-md font-semibold mb-4">Messages</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Welcome Message
                </label>
                <textarea
                  value={messages.welcome_message}
                  onChange={(e) =>
                    setMessages({ ...messages, welcome_message: e.target.value })
                  }
                  rows={2}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Offline Message
                </label>
                <textarea
                  value={messages.offline_message}
                  onChange={(e) =>
                    setMessages({ ...messages, offline_message: e.target.value })
                  }
                  rows={2}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Input Placeholder
                </label>
                <input
                  type="text"
                  value={messages.placeholder_text}
                  onChange={(e) =>
                    setMessages({ ...messages, placeholder_text: e.target.value })
                  }
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-8 pt-6 border-t border-neutral-800">
            <h3 className="text-md font-semibold mb-4">Features</h3>
            <div className="grid grid-cols-2 gap-4">
              <ToggleSwitch
                label="Show Business Branding"
                checked={features.show_branding}
                onChange={(v) => setFeatures({ ...features, show_branding: v })}
              />
              <ToggleSwitch
                label="Collect Customer Email"
                checked={features.collect_email}
                onChange={(v) => setFeatures({ ...features, collect_email: v })}
              />
              <ToggleSwitch
                label="Collect Customer Phone"
                checked={features.collect_phone}
                onChange={(v) => setFeatures({ ...features, collect_phone: v })}
              />
              <ToggleSwitch
                label="Collect Customer Name"
                checked={features.collect_name}
                onChange={(v) => setFeatures({ ...features, collect_name: v })}
              />
              <ToggleSwitch
                label="Require Email"
                checked={features.require_email}
                onChange={(v) => setFeatures({ ...features, require_email: v })}
              />
              <ToggleSwitch
                label="Show 'Powered by MykoDesk'"
                checked={features.show_powered_by}
                onChange={(v) => setFeatures({ ...features, show_powered_by: v })}
              />
              <ToggleSwitch
                label="Enable Sound Notifications"
                checked={features.enable_sound_notifications}
                onChange={(v) =>
                  setFeatures({ ...features, enable_sound_notifications: v })
                }
              />
              <ToggleSwitch
                label="Show Agent Avatars"
                checked={features.show_agent_avatars}
                onChange={(v) =>
                  setFeatures({ ...features, show_agent_avatars: v })
                }
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-neutral-800">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              Save Widget Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// AI Settings Tab
// =============================================================================

function AISettingsTab({
  data,
  onSave,
  saving,
}: {
  data: AISettings;
  onSave: (data: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    enabled: data.enabled,
    response_style: data.response_style,
    escalation_threshold: data.escalation_threshold,
    max_ai_turns: data.max_ai_turns,
    auto_resolve_enabled: data.auto_resolve_enabled,
    auto_resolve_hours: data.auto_resolve_hours,
    greeting_enabled: data.greeting_enabled,
    custom_instructions: data.custom_instructions || '',
  });

  const responseStyles = [
    { value: 'professional', label: 'Professional', desc: 'Formal and business-like' },
    { value: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
    { value: 'casual', label: 'Casual', desc: 'Relaxed and conversational' },
    { value: 'formal', label: 'Formal', desc: 'Very formal and polished' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="bg-[#232220] rounded-xl border border-neutral-800">
      <div className="p-6 border-b border-neutral-800">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="text-amber-500" size={20} />
          AI Configuration
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Control how the AI responds to customers
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* AI Enabled Toggle */}
        <div className="p-4 bg-neutral-800/50 rounded-lg">
          <ToggleSwitch
            label="Enable AI Responses"
            description="When disabled, all conversations go directly to human agents"
            checked={form.enabled}
            onChange={(v) => setForm({ ...form, enabled: v })}
          />
        </div>

        {/* Response Style */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-3">
            Response Style
          </label>
          <div className="grid grid-cols-2 gap-3">
            {responseStyles.map((style) => (
              <button
                key={style.value}
                type="button"
                onClick={() => setForm({ ...form, response_style: style.value })}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  form.response_style === style.value
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-neutral-700 hover:border-neutral-600'
                }`}
              >
                <div className="font-medium">{style.label}</div>
                <div className="text-xs text-neutral-500 mt-1">{style.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Escalation Threshold */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Escalation Threshold
          </label>
          <p className="text-xs text-neutral-500 mb-3">
            AI confidence below this threshold will trigger human escalation
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={form.escalation_threshold * 100}
              onChange={(e) =>
                setForm({
                  ...form,
                  escalation_threshold: parseInt(e.target.value) / 100,
                })
              }
              className="flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="w-16 text-center font-mono text-amber-400">
              {Math.round(form.escalation_threshold * 100)}%
            </span>
          </div>
        </div>

        {/* Max AI Turns */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Max AI Turns
          </label>
          <p className="text-xs text-neutral-500 mb-3">
            Maximum AI responses before suggesting human assistance
          </p>
          <input
            type="number"
            min="1"
            max="20"
            value={form.max_ai_turns}
            onChange={(e) =>
              setForm({ ...form, max_ai_turns: parseInt(e.target.value) || 5 })
            }
            className="w-24 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Auto Resolve */}
        <div className="space-y-4 p-4 bg-neutral-800/50 rounded-lg">
          <ToggleSwitch
            label="Auto-Resolve Conversations"
            description="Automatically close inactive conversations"
            checked={form.auto_resolve_enabled}
            onChange={(v) => setForm({ ...form, auto_resolve_enabled: v })}
          />
          {form.auto_resolve_enabled && (
            <div className="flex items-center gap-3 ml-6">
              <Clock size={16} className="text-neutral-500" />
              <span className="text-sm text-neutral-400">After</span>
              <input
                type="number"
                min="1"
                max="168"
                value={form.auto_resolve_hours}
                onChange={(e) =>
                  setForm({
                    ...form,
                    auto_resolve_hours: parseInt(e.target.value) || 24,
                  })
                }
                className="w-20 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500"
              />
              <span className="text-sm text-neutral-400">hours of inactivity</span>
            </div>
          )}
        </div>

        {/* Custom Instructions */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Custom Instructions
          </label>
          <p className="text-xs text-neutral-500 mb-3">
            Additional guidelines for the AI (e.g., specific policies, language preferences)
          </p>
          <textarea
            value={form.custom_instructions}
            onChange={(e) =>
              setForm({ ...form, custom_instructions: e.target.value })
            }
            rows={4}
            maxLength={2000}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 resize-none"
            placeholder="e.g., Always recommend scheduling through our online portal. Never quote prices without checking current rates..."
          />
          <div className="text-xs text-neutral-600 mt-1 text-right">
            {form.custom_instructions.length}/2000
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-neutral-800">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Save AI Settings
          </button>
        </div>
      </form>
    </div>
  );
}

// =============================================================================
// Notification Settings Tab
// =============================================================================

function NotificationSettingsTab({
  data,
  onSave,
  saving,
}: {
  data: NotificationSettings;
  onSave: (data: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    email_new_conversation: data.email_new_conversation,
    email_escalation: data.email_escalation,
    email_daily_digest: data.email_daily_digest,
    email_weekly_report: data.email_weekly_report,
    notification_email: data.notification_email || '',
    slack_webhook_url: data.slack_webhook_url || '',
    slack_enabled: data.slack_enabled,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="bg-[#232220] rounded-xl border border-neutral-800">
      <div className="p-6 border-b border-neutral-800">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="text-amber-500" size={20} />
          Notification Preferences
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Configure how you receive alerts and reports
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Notification Email */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Notification Email
          </label>
          <p className="text-xs text-neutral-500 mb-3">
            Email address for receiving notifications (leave empty to use account email)
          </p>
          <input
            type="email"
            value={form.notification_email}
            onChange={(e) =>
              setForm({ ...form, notification_email: e.target.value })
            }
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
            placeholder="notifications@example.com"
          />
        </div>

        {/* Email Notifications */}
        <div>
          <h3 className="text-md font-semibold mb-4">Email Notifications</h3>
          <div className="space-y-4 p-4 bg-neutral-800/50 rounded-lg">
            <ToggleSwitch
              label="New Conversations"
              description="Get notified when a new conversation starts"
              checked={form.email_new_conversation}
              onChange={(v) => setForm({ ...form, email_new_conversation: v })}
            />
            <ToggleSwitch
              label="Escalations"
              description="Get notified when AI escalates to human"
              checked={form.email_escalation}
              onChange={(v) => setForm({ ...form, email_escalation: v })}
            />
            <ToggleSwitch
              label="Daily Digest"
              description="Receive daily summary of conversations"
              checked={form.email_daily_digest}
              onChange={(v) => setForm({ ...form, email_daily_digest: v })}
            />
            <ToggleSwitch
              label="Weekly Report"
              description="Receive weekly analytics report"
              checked={form.email_weekly_report}
              onChange={(v) => setForm({ ...form, email_weekly_report: v })}
            />
          </div>
        </div>

        {/* Slack Integration */}
        <div>
          <h3 className="text-md font-semibold mb-4">Slack Integration</h3>
          <div className="space-y-4 p-4 bg-neutral-800/50 rounded-lg">
            <ToggleSwitch
              label="Enable Slack Notifications"
              description="Send alerts to a Slack channel"
              checked={form.slack_enabled}
              onChange={(v) => setForm({ ...form, slack_enabled: v })}
            />
            {form.slack_enabled && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={form.slack_webhook_url}
                  onChange={(e) =>
                    setForm({ ...form, slack_webhook_url: e.target.value })
                  }
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-neutral-800">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Save Notification Settings
          </button>
        </div>
      </form>
    </div>
  );
}

// =============================================================================
// Utility Components
// =============================================================================

function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-10 h-6 rounded-full transition-colors ${
            checked ? 'bg-amber-600' : 'bg-neutral-700'
          }`}
        />
        <div
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </div>
      <div>
        <div className="font-medium text-sm group-hover:text-amber-400 transition-colors">
          {label}
        </div>
        {description && (
          <div className="text-xs text-neutral-500 mt-0.5">{description}</div>
        )}
      </div>
    </label>
  );
}

function WidgetPreview({
  colors,
  messages,
  businessName,
}: {
  colors: WidgetSettings['colors'];
  messages: WidgetSettings['messages'];
  businessName: string;
}) {
  return (
    <div
      className="w-80 rounded-2xl shadow-2xl overflow-hidden"
      style={{ backgroundColor: colors.background_color }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: colors.primary_color }}
      >
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
          {businessName.charAt(0)}
        </div>
        <div className="text-white">
          <div className="font-semibold text-sm">{businessName}</div>
          <div className="text-xs opacity-80">Online</div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="p-4 h-48 flex flex-col">
        {/* Welcome message */}
        <div
          className="p-3 rounded-lg rounded-tl-none max-w-[80%] text-sm"
          style={{
            backgroundColor: colors.secondary_color,
            color: colors.text_color,
          }}
        >
          {messages.welcome_message}
        </div>

        <div className="flex-1" />

        {/* Input */}
        <div
          className="flex items-center gap-2 p-2 rounded-lg border"
          style={{
            borderColor: `${colors.text_color}30`,
            backgroundColor: `${colors.text_color}10`,
          }}
        >
          <input
            type="text"
            disabled
            placeholder={messages.placeholder_text}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: colors.text_color }}
          />
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: colors.primary_color }}
          >
            <span className="text-white text-xs">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}