-- ============================================
-- LOGS TABLE - Pentru Admin Dashboard
-- ============================================

CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
  category VARCHAR(50) NOT NULL CHECK (category IN ('auth', 'order', 'payment', 'menu', 'system', 'security', 'performance')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  user_id UUID,
  user_type VARCHAR(20) CHECK (user_type IN ('staff', 'manager', 'admin', 'guest')),
  ip_address INET,
  user_agent TEXT,
  stack_trace TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pentru queries rapide
CREATE INDEX idx_logs_venue_id ON logs(venue_id);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_category ON logs(category);
CREATE INDEX idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX idx_logs_venue_level ON logs(venue_id, level);

-- ============================================
-- ACTIVE SESSIONS - Track users online
-- ============================================

CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('staff', 'manager', 'admin', 'guest')),
  user_id UUID,
  user_name VARCHAR(255),
  table_id UUID REFERENCES event_tables(id) ON DELETE SET NULL,
  device_info JSONB DEFAULT '{}',
  ip_address INET,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_sessions_venue ON active_sessions(venue_id);
CREATE INDEX idx_sessions_active ON active_sessions(is_active);
CREATE INDEX idx_sessions_last_activity ON active_sessions(last_activity);

-- Auto-cleanup inactive sessions (older than 2 hours)
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  UPDATE active_sessions 
  SET is_active = false 
  WHERE last_activity < NOW() - INTERVAL '2 hours' 
  AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SYSTEM METRICS - Performance tracking
-- ============================================

CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metrics_venue ON system_metrics(venue_id);
CREATE INDEX idx_metrics_type ON system_metrics(metric_type);
CREATE INDEX idx_metrics_recorded ON system_metrics(recorded_at DESC);

-- ============================================
-- ERROR TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  component VARCHAR(100),
  user_action VARCHAR(255),
  browser_info JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_errors_venue ON error_reports(venue_id);
CREATE INDEX idx_errors_resolved ON error_reports(resolved);
CREATE INDEX idx_errors_created ON error_reports(created_at DESC);

-- ============================================
-- ADMIN USERS - Super admin access
-- ============================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCTION: Log event helper
-- ============================================

CREATE OR REPLACE FUNCTION log_event(
  p_venue_id UUID,
  p_level VARCHAR(20),
  p_category VARCHAR(50),
  p_message TEXT,
  p_details JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT NULL,
  p_user_type VARCHAR(20) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO logs (venue_id, level, category, message, details, user_id, user_type)
  VALUES (p_venue_id, p_level, p_category, p_message, p_details, p_user_id, p_user_type)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Update session activity
-- ============================================

CREATE OR REPLACE FUNCTION update_session_activity(p_session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE active_sessions 
  SET last_activity = NOW() 
  WHERE id = p_session_id AND is_active = true;
END;
$$ LANGUAGE plpgsql;
