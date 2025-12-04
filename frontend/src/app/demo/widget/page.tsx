'use client';

import ChatWidget from '@/components/chat/ChatWidget';
import '@/styles/design-system.css';

// Test tenant ID from our database
const DEMO_TENANT_ID = '85d0a74f-ee20-47e1-9113-52f4dae1b4ed';

export default function WidgetDemoPage() {
  return (
    <div style={pageStyles.container}>
      {/* Simulated Business Website */}
      <header style={pageStyles.header}>
        <div style={pageStyles.headerInner}>
          <div style={pageStyles.logo}>
            <span style={pageStyles.logoIcon}>❄️</span>
            <span style={pageStyles.logoText}>ACME HVAC</span>
          </div>
          <nav style={pageStyles.nav}>
            <a href="#" style={pageStyles.navLink}>Services</a>
            <a href="#" style={pageStyles.navLink}>About</a>
            <a href="#" style={pageStyles.navLink}>Contact</a>
            <a href="#" style={pageStyles.navLinkCta}>Get a Quote</a>
          </nav>
        </div>
      </header>

      <main style={pageStyles.main}>
        {/* Hero Section */}
        <section style={pageStyles.hero}>
          <h1 style={pageStyles.heroTitle}>
            Keeping New Jersey<br />
            <span style={pageStyles.heroHighlight}>Cool in Summer, Warm in Winter</span>
          </h1>
          <p style={pageStyles.heroSubtitle}>
            Family-owned HVAC services since 1998. 24/7 emergency repairs,
            installations, and maintenance for homes and businesses.
          </p>
          <div style={pageStyles.heroCtas}>
            <button style={pageStyles.ctaPrimary}>Schedule Service</button>
            <button style={pageStyles.ctaSecondary}>Call (555) 123-4567</button>
          </div>
        </section>

        {/* Services Preview */}
        <section style={pageStyles.services}>
          <h2 style={pageStyles.sectionTitle}>Our Services</h2>
          <div style={pageStyles.serviceGrid}>
            {[
              { icon: '🔧', title: 'Repairs', desc: 'Fast, reliable fixes for all brands' },
              { icon: '❄️', title: 'AC Installation', desc: 'Energy-efficient cooling solutions' },
              { icon: '🔥', title: 'Heating', desc: 'Furnaces, heat pumps, and more' },
              { icon: '🛡️', title: 'Maintenance', desc: 'Keep your system running smooth' },
            ].map((service, i) => (
              <div key={i} style={pageStyles.serviceCard}>
                <span style={pageStyles.serviceIcon}>{service.icon}</span>
                <h3 style={pageStyles.serviceTitle}>{service.title}</h3>
                <p style={pageStyles.serviceDesc}>{service.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Demo Notice */}
        <section style={pageStyles.demoNotice}>
          <div style={pageStyles.demoNoticeInner}>
            <h3 style={pageStyles.demoTitle}>👋 This is a Widget Demo</h3>
            <p style={pageStyles.demoText}>
              Click the <strong style={{ color: '#D97706' }}>amber chat bubble</strong> in the 
              bottom-right corner to try the CybinAI chat widget. This is connected to the real 
              backend with placeholder AI responses.
            </p>
            <p style={pageStyles.demoText}>
              The widget is designed with our <strong>"Industrial Warmth"</strong> identity — 
              professional yet approachable, standing out from generic SaaS blue.
            </p>
          </div>
        </section>
      </main>

      <footer style={pageStyles.footer}>
        <p>© 2025 ACME HVAC (Demo Site) · Powered by CybinAI</p>
      </footer>

      {/* The CybinAI Chat Widget */}
      <ChatWidget tenantId={DEMO_TENANT_ID} />
    </div>
  );
}

// Inline styles for the demo page (not part of the design system)
const pageStyles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)',
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
  },
  header: {
    background: 'white',
    borderBottom: '1px solid #E2E8F0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    fontSize: 28,
  },
  logoText: {
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 700,
    fontSize: 20,
    color: '#1E293B',
    letterSpacing: '-0.02em',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  navLink: {
    color: '#64748B',
    textDecoration: 'none',
    fontSize: 15,
    fontWeight: 500,
    transition: 'color 0.2s',
  },
  navLinkCta: {
    background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    color: 'white',
    padding: '10px 20px',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: 15,
    fontWeight: 600,
  },
  main: {
    flex: 1,
  },
  hero: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '80px 24px',
    textAlign: 'center',
  },
  heroTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 48,
    fontWeight: 700,
    color: '#1E293B',
    lineHeight: 1.2,
    letterSpacing: '-0.03em',
    margin: '0 0 24px',
  },
  heroHighlight: {
    background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#64748B',
    lineHeight: 1.6,
    margin: '0 0 32px',
    maxWidth: 600,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  heroCtas: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  ctaPrimary: {
    background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    color: 'white',
    border: 'none',
    padding: '14px 28px',
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 10,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.3)',
  },
  ctaSecondary: {
    background: 'white',
    color: '#334155',
    border: '2px solid #E2E8F0',
    padding: '12px 26px',
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 10,
    cursor: 'pointer',
  },
  services: {
    maxWidth: 1000,
    margin: '0 auto',
    padding: '40px 24px 80px',
  },
  sectionTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 32,
    fontWeight: 700,
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 40,
  },
  serviceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 24,
  },
  serviceCard: {
    background: 'white',
    borderRadius: 12,
    padding: 24,
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: '1px solid #E2E8F0',
  },
  serviceIcon: {
    fontSize: 36,
    display: 'block',
    marginBottom: 12,
  },
  serviceTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 18,
    fontWeight: 600,
    color: '#1E293B',
    margin: '0 0 8px',
  },
  serviceDesc: {
    fontSize: 14,
    color: '#64748B',
    margin: 0,
    lineHeight: 1.5,
  },
  demoNotice: {
    background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
    padding: '60px 24px',
  },
  demoNoticeInner: {
    maxWidth: 600,
    margin: '0 auto',
    textAlign: 'center',
  },
  demoTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 24,
    fontWeight: 600,
    color: 'white',
    margin: '0 0 16px',
  },
  demoText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 1.6,
    margin: '0 0 12px',
  },
  footer: {
    background: '#0F172A',
    color: 'rgba(255,255,255,0.5)',
    padding: '24px',
    textAlign: 'center',
    fontSize: 14,
  },
};