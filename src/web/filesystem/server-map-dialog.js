// Minimal modal overlays for picking a server map id. Deliberately plain DOM
// (not Spectrum) so they are self-contained and version-proof. Cancel rejects
// with an AbortError, which eomap-js's open()/saveAs() already swallow.

function abortError() {
  const e = new Error("The user aborted a request.");
  e.name = "AbortError";
  return e;
}

function overlay() {
  const root = document.createElement("div");
  root.style.cssText =
    "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;" +
    "justify-content:center;background:rgba(0,0,0,0.5);font-family:sans-serif;";
  const panel = document.createElement("div");
  panel.style.cssText =
    "background:#1f2430;color:#e6e6e6;min-width:320px;max-width:90vw;max-height:80vh;" +
    "overflow:auto;border-radius:8px;padding:16px;box-shadow:0 10px 40px rgba(0,0,0,0.5);";
  root.appendChild(panel);
  return { root, panel };
}

export function openServerMapDialog(ids) {
  return new Promise((resolve, reject) => {
    const { root, panel } = overlay();
    const title = document.createElement("h2");
    title.textContent = "Open map from server";
    title.style.cssText = "margin:0 0 12px;font-size:16px;";
    panel.appendChild(title);

    if (ids.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No maps on the server yet.";
      panel.appendChild(empty);
    }

    const list = document.createElement("div");
    list.style.cssText =
      "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;";
    for (const id of ids) {
      const btn = document.createElement("button");
      btn.textContent = String(id);
      btn.style.cssText =
        "padding:4px 10px;border-radius:6px;border:1px solid #3a4150;background:#2a3140;" +
        "color:#e6e6e6;cursor:pointer;";
      btn.addEventListener("click", () => {
        cleanup();
        resolve(id);
      });
      list.appendChild(btn);
    }
    panel.appendChild(list);

    const cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    cancel.style.cssText =
      "padding:6px 14px;border-radius:6px;border:1px solid #3a4150;background:transparent;" +
      "color:#cbd2dd;cursor:pointer;";
    cancel.addEventListener("click", () => {
      cleanup();
      reject(abortError());
    });
    panel.appendChild(cancel);

    function onKey(e) {
      if (e.key === "Escape") {
        cleanup();
        reject(abortError());
      }
    }
    function cleanup() {
      document.removeEventListener("keydown", onKey);
      root.remove();
    }
    document.addEventListener("keydown", onKey);
    document.body.appendChild(root);
  });
}

export function saveServerMapDialog(existingIds) {
  return new Promise((resolve, reject) => {
    const { root, panel } = overlay();
    const title = document.createElement("h2");
    title.textContent = "Save map to server";
    title.style.cssText = "margin:0 0 12px;font-size:16px;";
    panel.appendChild(title);

    const label = document.createElement("label");
    label.textContent = "Map id (1–32000):";
    label.style.cssText =
      "display:block;margin-bottom:6px;font-size:13px;color:#cbd2dd;";
    panel.appendChild(label);

    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "32000";
    const next = existingIds.length ? Math.max(...existingIds) + 1 : 1;
    input.value = String(next);
    input.style.cssText =
      "width:120px;padding:6px;border-radius:6px;border:1px solid #3a4150;background:#2a3140;" +
      "color:#e6e6e6;margin-bottom:6px;";
    panel.appendChild(input);

    const warn = document.createElement("p");
    warn.style.cssText =
      "min-height:16px;margin:6px 0;font-size:12px;color:#e0a64b;";
    panel.appendChild(warn);

    const refreshWarn = () => {
      const v = Number(input.value);
      warn.textContent = existingIds.includes(v)
        ? `Map ${v} exists — it will be overwritten.`
        : "";
    };
    input.addEventListener("input", refreshWarn);
    refreshWarn();

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;margin-top:8px;";
    const ok = document.createElement("button");
    ok.textContent = "Save";
    ok.style.cssText =
      "padding:6px 14px;border-radius:6px;border:none;background:#2f7fe0;color:#fff;cursor:pointer;";
    const cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    cancel.style.cssText =
      "padding:6px 14px;border-radius:6px;border:1px solid #3a4150;background:transparent;" +
      "color:#cbd2dd;cursor:pointer;";
    row.appendChild(ok);
    row.appendChild(cancel);
    panel.appendChild(row);

    const submit = () => {
      const v = Number(input.value);
      if (!Number.isInteger(v) || v < 1 || v > 32000) {
        warn.textContent = "Enter an integer between 1 and 32000.";
        return;
      }
      cleanup();
      resolve(v);
    };
    ok.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    cancel.addEventListener("click", () => {
      cleanup();
      reject(abortError());
    });
    function onKey(e) {
      if (e.key === "Escape") {
        cleanup();
        reject(abortError());
      }
    }
    function cleanup() {
      document.removeEventListener("keydown", onKey);
      root.remove();
    }
    document.addEventListener("keydown", onKey);
    document.body.appendChild(root);
    input.focus();
    input.select();
  });
}
