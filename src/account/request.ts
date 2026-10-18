// A failed backend must not leave signup or sign-in spinning indefinitely.
export async function accountFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const controller = new AbortController();
  const caller =
    init.signal || (input instanceof Request ? input.signal : null);
  const abort = () => controller.abort(caller?.reason);
  if (caller?.aborted) abort();
  else caller?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(
    () =>
      controller.abort(
        new DOMException("Account request timed out", "TimeoutError"),
      ),
    20000,
  );
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    caller?.removeEventListener("abort", abort);
  }
}
