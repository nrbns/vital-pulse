-- PostgreSQL Triggers for Realtime Notifications
-- These triggers use LISTEN/NOTIFY to notify Node.js backend of database changes

-- Function to notify on emergency created
CREATE OR REPLACE FUNCTION notify_emergency_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('emergency_created', json_build_object(
    'id', NEW.id,
    'user_id', NEW.user_id,
    'blood_group', NEW.blood_group,
    'urgency', NEW.urgency,
    'hospital_latitude', NEW.hospital_latitude,
    'hospital_longitude', NEW.hospital_longitude,
    'country_code', NEW.country_code,
    'created_at', NEW.created_at
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for emergency creation
DROP TRIGGER IF EXISTS trigger_emergency_created ON blood_requests;
CREATE TRIGGER trigger_emergency_created
  AFTER INSERT ON blood_requests
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION notify_emergency_created();

-- Function to notify on emergency response
CREATE OR REPLACE FUNCTION notify_emergency_response()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('emergency_response', json_build_object(
    'id', NEW.id,
    'emergency_id', NEW.request_id,
    'donor_id', NEW.donor_id,
    'hospital_id', NEW.hospital_id,
    'response_type', NEW.response_type,
    'status', NEW.status,
    'created_at', NEW.created_at
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for emergency response
DROP TRIGGER IF EXISTS trigger_emergency_response ON blood_request_responses;
CREATE TRIGGER trigger_emergency_response
  AFTER INSERT ON blood_request_responses
  FOR EACH ROW
  EXECUTE FUNCTION notify_emergency_response();

-- Function to notify on emergency status update
CREATE OR REPLACE FUNCTION notify_emergency_status_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    PERFORM pg_notify('emergency_status_update', json_build_object(
      'id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'updated_at', NEW.updated_at
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for emergency status update
DROP TRIGGER IF EXISTS trigger_emergency_status_update ON blood_requests;
CREATE TRIGGER trigger_emergency_status_update
  AFTER UPDATE ON blood_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_emergency_status_update();

-- Function to notify on hospital status update
CREATE OR REPLACE FUNCTION notify_hospital_status_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_active != NEW.is_active OR 
     (OLD.emergency IS DISTINCT FROM NEW.emergency) THEN
    PERFORM pg_notify('hospital_status_update', json_build_object(
      'id', NEW.id,
      'name', NEW.name,
      'type', NEW.type,
      'emergency', NEW.emergency,
      'is_active', NEW.is_active,
      'latitude', NEW.latitude,
      'longitude', NEW.longitude,
      'country_code', NEW.country_code
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for hospital status update
DROP TRIGGER IF EXISTS trigger_hospital_status_update ON hospitals;
CREATE TRIGGER trigger_hospital_status_update
  AFTER UPDATE ON hospitals
  FOR EACH ROW
  WHEN (
    OLD.is_active IS DISTINCT FROM NEW.is_active OR
    OLD.emergency IS DISTINCT FROM NEW.emergency
  )
  EXECUTE FUNCTION notify_hospital_status_update();

-- Function to notify on blood inventory update
CREATE OR REPLACE FUNCTION notify_blood_inventory_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('blood_inventory_update', json_build_object(
    'hospital_id', NEW.hospital_id,
    'blood_group', NEW.blood_group,
    'status', NEW.status,
    'units', NEW.units,
    'last_updated', NEW.last_updated
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for blood inventory update
DROP TRIGGER IF EXISTS trigger_blood_inventory_update ON blood_inventory;
CREATE TRIGGER trigger_blood_inventory_update
  AFTER INSERT OR UPDATE ON blood_inventory
  FOR EACH ROW
  EXECUTE FUNCTION notify_blood_inventory_update();

