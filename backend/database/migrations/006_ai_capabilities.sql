CREATE TABLE IF NOT EXISTS ai_capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tier INTEGER DEFAULT 1 CHECK (tier IN (1, 2, 3)),
    can_book_appointments BOOLEAN DEFAULT FALSE,
    can_send_reminders BOOLEAN DEFAULT FALSE,
    can_handle_cancellations BOOLEAN DEFAULT FALSE,
    can_follow_up_leads BOOLEAN DEFAULT FALSE,
    can_request_reviews BOOLEAN DEFAULT FALSE,
    can_handle_complaints BOOLEAN DEFAULT FALSE,
    custom_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_ai_capabilities_tenant ON ai_capabilities(tenant_id);
CREATE TRIGGER update_ai_capabilities_updated_at BEFORE UPDATE ON ai_capabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
