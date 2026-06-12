// Embedded-mode glue. The AIO frontend hosts this build in a same-origin
// iframe and posts the admin token in. We only accept messages from our own
// origin, and we never put the token in a URL.

let _token = null;
const _waiters = [];

export function isEmbedded() {
  return (
    typeof window !== "undefined" && window.parent && window.parent !== window
  );
}

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (data && data.type === "aio-auth" && typeof data.token === "string") {
    _token = data.token;
    while (_waiters.length) _waiters.shift()(_token);
  }
});

export function getToken() {
  return _token;
}

// Resolve once a token is available (used to gate the first server call).
export function whenToken() {
  if (_token) return Promise.resolve(_token);
  return new Promise((resolve) => _waiters.push(resolve));
}

// Tell the parent we're ready to receive the token.
export function signalReady() {
  if (isEmbedded()) {
    window.parent.postMessage({ type: "aio-ready" }, window.location.origin);
  }
}
