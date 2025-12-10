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

        {/* Services Grid */}
        <section style={pageStyles.services}>
          <h2 style={pageStyles.sectionTitle}>Our Services</h2>
          <div style={pageStyles.servicesGrid}>
            {[
              { icon: '❄️', title: 'AC Repair', desc: 'Fast cooling system repairs' },
              { icon: '🔥', title: 'Heating', desc: 'Furnace & heat pump service' },
              { icon: '🔧', title: 'Maintenance', desc: 'Preventive tune-ups' },
              { icon: '🏠', title: 'Installation', desc: 'New system installation' },
            ].map((service, i) => (
              <div key={i} style={pageStyles.serviceCard}>
                <span style={pageStyles.serviceIcon}>{service.icon}</span>
                <h3 style={pageStyles.serviceTitle}>{service.title}</h3>
                <p style={pageStyles.serviceDesc}>{service.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Demo Banner */}
        <section style={pageStyles.demoBanner}>
          <div style={pageStyles.demoBannerInner}>
            <span style={pageStyles.demoBadge}>DEMO MODE</span>
            <p style={pageStyles.demoText}>
              This is a simulated HVAC business website. Click the chat bubble in the 
              bottom-right corner to test the AI-powered customer service widget.
            </p>
          </div>
        </section>
      </main>

      <footer style={pageStyles.footer}>
        <p>© 2024 ACME HVAC (Demo) • Powered by CybinAI</p>
      </footer>

      {/* The Chat Widget */}
      <ChatWidget tenantId={DEMO_TENANT_ID} />
    </div>
  );
}

// Inline styles for this demo page (dark mode)
const pageStyles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #1A1915 0%, #0F0E0C 100%)',
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    color: '#E5E5E5',
  },
  header: {
    background: 'rgba(19, 18, 16, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '16px 24px',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoIcon: {
    fontSize: '28px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#F5F5F4',
    letterSpacing: '-0.02em',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  navLink: {
    color: '#A3A3A3',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'color 0.2s',
  },
  navLinkCta: {
    background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
  },
  hero: {
    padding: '80px 0',
    textAlign: 'center' as const,
  },
  heroTitle: {
    fontSize: '48px',
    fontWeight: 700,
    color: '#F5F5F4',
    lineHeight: 1.2,
    marginBottom: '24px',
    letterSpacing: '-0.02em',
  },
  heroHighlight: {
    color: '#F59E0B',
  },
  heroSubtitle: {
    fontSize: '18px',
    color: '#A3A3A3',
    maxWidth: '600px',
    margin: '0 auto 32px',
    lineHeight: 1.6,
  },
  heroCtas: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },
  ctaPrimary: {
    background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    color: 'white',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)',
  },
  ctaSecondary: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#E5E5E5',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '16px 32px',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  services: {
    padding: '60px 0',
  },
  sectionTitle: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#F5F5F4',
    textAlign: 'center' as const,
    marginBottom: '40px',
    letterSpacing: '-0.02em',
  },
  servicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
  },
  serviceCard: {
    background: '#232220',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '32px 24px',
    textAlign: 'center' as const,
    transition: 'all 0.2s ease',
  },
  serviceIcon: {
    fontSize: '40px',
    display: 'block',
    marginBottom: '16px',
  },
  serviceTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#F5F5F4',
    marginBottom: '8px',
  },
  serviceDesc: {
    fontSize: '14px',
    color: '#A3A3A3',
    margin: 0,
  },
  demoBanner: {
    margin: '40px 0',
    padding: '24px',
    background: 'rgba(217, 119, 6, 0.1)',
    border: '1px solid rgba(217, 119, 6, 0.2)',
    borderRadius: '12px',
  },
  demoBannerInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  demoBadge: {
    background: '#D97706',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  demoText: {
    color: '#FCD34D',
    fontSize: '14px',
    margin: 0,
    textAlign: 'center' as const,
  },
  footer: {
    background: '#131210',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '24px',
    textAlign: 'center' as const,
    color: '#737373',
    fontSize: '14px',
  },
};