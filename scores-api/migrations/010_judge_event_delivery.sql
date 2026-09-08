-- Apply only if client_action_id is absent. ensureSchema performs this check.
ALTER TABLE eventos_partido
  ADD COLUMN client_action_id CHAR(36) NULL,
  ADD UNIQUE KEY uq_event_client_action (client_action_id);
