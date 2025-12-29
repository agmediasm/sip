-- Add is_default column to menu_templates
ALTER TABLE menu_templates ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Ensure only one default per venue
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE menu_templates SET is_default = false WHERE venue_id = NEW.venue_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS single_default_template ON menu_templates;
CREATE TRIGGER single_default_template
  BEFORE INSERT OR UPDATE ON menu_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_template();
