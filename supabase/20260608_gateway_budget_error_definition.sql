insert into public.gateway_error_definitions (
  code,
  category,
  http_status,
  public_message,
  retryable,
  active,
  sort_order,
  operator_notes
)
values (
  'budget_exceeded',
  'billing',
  402,
  'This request would exceed the configured monthly budget. Adjust the budget or wait for the next billing period.',
  false,
  true,
  45,
  'The gateway estimated this request would exceed an API key, workspace, or model monthly budget hard limit.'
)
on conflict (code) do update
set
  category = excluded.category,
  http_status = excluded.http_status,
  public_message = excluded.public_message,
  retryable = excluded.retryable,
  active = excluded.active,
  sort_order = excluded.sort_order,
  operator_notes = excluded.operator_notes;
