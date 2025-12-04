-- CybinAI Database Initialization Script
-- This script runs when the PostgreSQL container is first created

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- ENUMS
-- =====================
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'agent');
CREATE TYPE conversation_status AS ENUM ('open', 'pending', 'resolved', 'closed');
CREATE TYPE conversation_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE channel_type AS ENUM ('chat', 'email', 'sms', 'facebook', 'instagram', 'whatsapp');
CREATE TYPE sender_type AS ENUM ('customer', 'ai', 'agent', 'system');

-- =====================
-- TENANTS (Businesses)
-- =====================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(63) UNIQUE NOT NULL,
    custom_domain VARCHAR(255) UNIQUE,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);

-- =====================
-- USERS (Agents/Admins)
-- =====================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'agent',
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_tenant_email ON users(tenant_id, email);

-- =====================
-- CUSTOMERS (End users)
-- =====================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255),
    phone VARCHAR(50),
    name VARCHAR(255),
    external_ids JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS ix_customers_tenant_email ON customers(tenant_id, email);
CREATE INDEX IF NOT EXISTS ix_customers_tenant_phone ON customers(tenant_id, phone);

-- =====================
-- CONVERSATIONS (Tickets)
-- =====================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(500),
    channel channel_type DEFAULT 'chat',
    status conversation_status DEFAULT 'open',
    priority conversation_priority DEFAULT 'normal',
    ai_handled BOOLEAN DEFAULT TRUE,
    ai_confidence FLOAT,
    ai_summary TEXT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    first_response_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS ix_conversations_tenant_status ON conversations(tenant_id, status);
CREATE INDEX IF NOT EXISTS ix_conversations_tenant_created ON conversations(tenant_id, created_at);

-- =====================
-- MESSAGES
-- =====================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type sender_type NOT NULL,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',
    attachments JSONB DEFAULT '[]',
    ai_metadata JSONB DEFAULT '{}',
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- =====================
-- KNOWLEDGE BASE ARTICLES
-- =====================
CREATE TABLE IF NOT EXISTS kb_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    published BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kb_articles_tenant ON kb_articles(tenant_id);
CREATE INDEX IF NOT EXISTS ix_kb_articles_tenant_category ON kb_articles(tenant_id, category);
CREATE INDEX IF NOT EXISTS ix_kb_articles_tenant_published ON kb_articles(tenant_id, published);

-- =====================
-- INTEGRATIONS
-- =====================
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    credentials JSONB NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_integrations_tenant_type ON integrations(tenant_id, type);

-- =====================
-- CANNED RESPONSES
-- =====================
CREATE TABLE IF NOT EXISTS canned_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    shortcut VARCHAR(50),
    content TEXT NOT NULL,
    category VARCHAR(100),
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_canned_responses_tenant ON canned_responses(tenant_id);
CREATE INDEX IF NOT EXISTS ix_canned_responses_tenant_shortcut ON canned_responses(tenant_id, shortcut);

-- =====================
-- AUDIT LOG
-- =====================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS ix_audit_log_tenant_created ON audit_log(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS ix_audit_log_tenant_action ON audit_log(tenant_id, action);

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kb_articles_updated_at BEFORE UPDATE ON kb_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_canned_responses_updated_at BEFORE UPDATE ON canned_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'CybinAI database initialized successfully!';
END $$;