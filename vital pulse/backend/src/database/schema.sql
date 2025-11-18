-- Pulse Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Countries table
CREATE TABLE IF NOT EXISTS countries (
  code VARCHAR(2) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  donation_interval_days INTEGER DEFAULT 56,
  min_donor_age INTEGER DEFAULT 18,
  max_donor_age INTEGER DEFAULT 65,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  country_code VARCHAR(2) NOT NULL DEFAULT 'IN',
  preferred_language VARCHAR(10) DEFAULT 'en',
  name VARCHAR(100),
  age INTEGER,
  city VARCHAR(100),
  gender VARCHAR(20),
  blood_group VARCHAR(5),
  last_donation_date DATE,
  health_notes TEXT,
  roles TEXT[] DEFAULT ARRAY['user'],
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_updated_at TIMESTAMP,
  privacy_settings JSONB DEFAULT '{"showPhone": false, "showName": true, "availabilityMode": "always", "contactPreference": "in_app_only"}'::jsonb,
  -- privacy_settings: showPhone, showName, availabilityMode (always/weekends_only/emergency_only), contactPreference (in_app_only/hospitals_only/all)
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  ban_until TIMESTAMP, -- Temporary ban expiration
  request_rate_limit_count INTEGER DEFAULT 0,
  request_rate_limit_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  call_rate_limit_count INTEGER DEFAULT 0,
  call_rate_limit_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  disclaimer_accepted BOOLEAN DEFAULT false,
  disclaimer_accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (country_code) REFERENCES countries(code)
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_country_code ON users(country_code);
CREATE INDEX idx_users_blood_group ON users(blood_group);
CREATE INDEX idx_users_location ON users USING GIST(ST_MakePoint(longitude, latitude));

-- Donors table
CREATE TABLE IF NOT EXISTS donors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL,
  blood_group VARCHAR(5) NOT NULL,
  last_donation_date DATE,
  health_notes TEXT,
  availability VARCHAR(50),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_eligible BOOLEAN DEFAULT true,
  next_donation_date DATE,
  total_donations INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_donors_user_id ON donors(user_id);
CREATE INDEX idx_donors_blood_group ON donors(blood_group);
CREATE INDEX idx_donors_eligible ON donors(is_eligible, next_donation_date);
CREATE INDEX idx_donors_location ON donors USING GIST(ST_MakePoint(longitude, latitude));

-- Donation history
CREATE TABLE IF NOT EXISTS donation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id UUID NOT NULL,
  donation_date DATE NOT NULL,
  location VARCHAR(255),
  blood_group VARCHAR(5),
  verified BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE
);

CREATE INDEX idx_donation_history_donor_id ON donation_history(donor_id);
CREATE INDEX idx_donation_history_date ON donation_history(donation_date);

-- Hospitals and Blood Banks
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'hospital', 'clinic', 'blood_bank'
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country_code VARCHAR(2) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  email VARCHAR(255),
  emergency BOOLEAN DEFAULT false,
  operating_hours JSONB,
  specialties TEXT[],
  rating DECIMAL(3, 2),
  verified BOOLEAN DEFAULT false,
  verified_by UUID, -- admin user id
  verified_at TIMESTAMP,
  created_by UUID, -- user id who registered
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (country_code) REFERENCES countries(code),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_hospitals_type ON hospitals(type);
CREATE INDEX idx_hospitals_country_code ON hospitals(country_code);
CREATE INDEX idx_hospitals_emergency ON hospitals(emergency);
CREATE INDEX idx_hospitals_location ON hospitals USING GIST(ST_MakePoint(longitude, latitude));

-- Blood inventory (for blood banks)
CREATE TABLE IF NOT EXISTS blood_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL,
  blood_group VARCHAR(5) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'available', 'low', 'out_of_stock'
  units INTEGER,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
  UNIQUE(hospital_id, blood_group)
);

CREATE INDEX idx_blood_inventory_hospital_id ON blood_inventory(hospital_id);
CREATE INDEX idx_blood_inventory_status ON blood_inventory(status);

-- Blood requests
CREATE TABLE IF NOT EXISTS blood_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  blood_group VARCHAR(5) NOT NULL,
  urgency VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  patient_name VARCHAR(100),
  hospital_name VARCHAR(255) NOT NULL, -- MANDATORY: Cannot be null
  hospital_address TEXT,
  hospital_bed_number VARCHAR(50), -- MANDATORY: Bed/ward number for verification
  hospital_ward VARCHAR(100), -- Ward/department
  hospital_latitude DECIMAL(10, 8),
  hospital_longitude DECIMAL(11, 8),
  contact_phone VARCHAR(20),
  contact_phone_masked BOOLEAN DEFAULT true, -- Never show direct phone
  notes TEXT,
  prescription_image_url TEXT,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'fulfilled', 'cancelled', 'hidden'
  verified_by_hospital BOOLEAN DEFAULT false, -- Hospital can verify request
  verified_hospital_id UUID, -- Hospital that verified (if any)
  verified_at TIMESTAMP,
  visible_radius_km INTEGER DEFAULT 30, -- Only show within 30km
  report_count INTEGER DEFAULT 0, -- Auto-hide after 3 reports
  hidden_at TIMESTAMP, -- Auto-hide timestamp
  hidden_reason TEXT,
  matched_donors_count INTEGER DEFAULT 0,
  matched_blood_banks_count INTEGER DEFAULT 0,
  country_code VARCHAR(2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (country_code) REFERENCES countries(code),
  FOREIGN KEY (verified_hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX idx_blood_requests_user_id ON blood_requests(user_id);
CREATE INDEX idx_blood_requests_status ON blood_requests(status);
CREATE INDEX idx_blood_requests_blood_group ON blood_requests(blood_group);
CREATE INDEX idx_blood_requests_location ON blood_requests USING GIST(ST_MakePoint(hospital_longitude, hospital_latitude));
CREATE INDEX idx_blood_requests_active ON blood_requests(status, created_at) WHERE status = 'active';

-- Blood request responses
CREATE TABLE IF NOT EXISTS blood_request_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL,
  donor_id UUID,
  hospital_id UUID, -- if blood bank responded
  response_type VARCHAR(20) NOT NULL, -- 'donor', 'blood_bank'
  available BOOLEAN DEFAULT false,
  estimated_arrival TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id) REFERENCES donors(id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX idx_blood_request_responses_request_id ON blood_request_responses(request_id);
CREATE INDEX idx_blood_request_responses_donor_id ON blood_request_responses(donor_id);

-- Events (Donation Camps)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  organizer_id UUID, -- user id (hospital/NGO)
  organizer_name VARCHAR(255),
  description TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  address TEXT,
  city VARCHAR(100),
  country_code VARCHAR(2) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  max_capacity INTEGER,
  registered_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(id),
  FOREIGN KEY (country_code) REFERENCES countries(code)
);

CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_country_code ON events(country_code);
CREATE INDEX idx_events_location ON events USING GIST(ST_MakePoint(longitude, latitude));
CREATE INDEX idx_events_active ON events(is_active, date) WHERE is_active = true;

-- Event registrations
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  donor_id UUID,
  status VARCHAR(20) DEFAULT 'registered', -- 'registered', 'attended', 'cancelled'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id) REFERENCES donors(id),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_user_id ON event_registrations(user_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'blood_request', 'donation_reminder', 'event_reminder', etc.
  title VARCHAR(255),
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Reports (for abuse/fake requests)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- 'fake_request', 'abuse', 'spam', 'harassment', 'wrong_info'
  target_type VARCHAR(50) NOT NULL, -- 'blood_request', 'user', 'hospital'
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT, -- Additional details
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed', 'auto_hidden'
  reviewed_by UUID, -- admin user id
  reviewed_at TIMESTAMP,
  auto_action_taken BOOLEAN DEFAULT false, -- If auto-hide was triggered
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Create unique constraint to prevent duplicate reports from same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique 
  ON reports(reporter_id, target_type, target_id) 
  WHERE status != 'dismissed';

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);

-- OTP verification (temporary)
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL,
  otp VARCHAR(10) NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Masked calls/messages (proxy communication)
CREATE TABLE IF NOT EXISTS masked_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL,
  to_user_id UUID, -- User (if messaging a donor)
  to_hospital_id UUID, -- Hospital (if calling hospital)
  communication_type VARCHAR(20) NOT NULL, -- 'call', 'message', 'chat'
  masked_from_number VARCHAR(20), -- Twilio proxy number
  masked_to_number VARCHAR(20),
  original_message TEXT, -- For messages/chats
  auto_delete_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '48 hours'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id),
  FOREIGN KEY (to_hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX idx_masked_communications_auto_delete ON masked_communications(auto_delete_at);
CREATE INDEX idx_masked_communications_from ON masked_communications(from_user_id);
CREATE INDEX idx_masked_communications_to ON masked_communications(to_user_id, to_hospital_id);

CREATE INDEX idx_otp_phone ON otp_verifications(phone);
CREATE INDEX idx_otp_expires ON otp_verifications(expires_at);

-- User tokens (for FCM push notifications)
CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  token_type VARCHAR(20) NOT NULL, -- 'fcm', 'apns', etc.
  token TEXT NOT NULL,
  device_id VARCHAR(255),
  device_type VARCHAR(50), -- 'android', 'ios', 'web'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, token_type, token)
);

CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX idx_user_tokens_active ON user_tokens(user_id, is_active) WHERE is_active = true;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donors_updated_at BEFORE UPDATE ON donors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON hospitals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blood_requests_updated_at BEFORE UPDATE ON blood_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

