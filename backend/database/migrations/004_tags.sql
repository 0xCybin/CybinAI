-- =============================================================================
-- Tags Migration
-- Adds tags and conversation_tags tables for ticket categorization
-- =============================================================================

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for tags
CREATE INDEX IF NOT EXISTS idx_tags_tenant ON tags(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_tags_tenant_name ON tags(tenant_id, name);

-- Conversation tags association table
CREATE TABLE IF NOT EXISTS conversation_tags (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    PRIMARY KEY (conversation_id, tag_id)
);

-- Indexes for conversation_tags
CREATE INDEX IF NOT EXISTS ix_conversation_tags_tag ON conversation_tags(tag_id);
CREATE INDEX IF NOT EXISTS ix_conversation_tags_conversation ON conversation_tags(conversation_id);

-- =============================================================================
-- Trigger to auto-update updated_at on tags
-- =============================================================================

-- Create trigger function if not exists (may already exist from other tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for tags table
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Sample tags (optional - comment out if not needed)
-- =============================================================================

-- These would be inserted per-tenant, not here
-- INSERT INTO tags (tenant_id, name, color, description) VALUES
--     ('tenant-uuid', 'Urgent', '#EF4444', 'High priority issues'),
--     ('tenant-uuid', 'Bug', '#F59E0B', 'Software bugs'),
--     ('tenant-uuid', 'Feature Request', '#3B82F6', 'Customer feature requests'),
--     ('tenant-uuid', 'Billing', '#10B981', 'Billing related inquiries'),
--     ('tenant-uuid', 'Scheduling', '#8B5CF6', 'Appointment scheduling');