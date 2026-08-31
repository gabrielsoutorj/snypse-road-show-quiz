-- Functions in the private schema remain individually restricted, while
-- authenticated Realtime policies and service-role transactions may resolve them.
grant usage on schema private to authenticated, service_role;
