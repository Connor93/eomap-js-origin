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

// `maps` is [{ id, name }]. Resolves the chosen entry; rejects AbortError on
// cancel/Escape. A search box filters by name or id; ↑/↓ move the highlight,
// Enter opens it. Render is capped so a huge map set stays responsive.
export function openServerMapDialog(maps) {
  return new Promise((resolve, reject) => {
    const MAX_ROWS = 300;
    const { root, panel } = overlay();
    panel.style.width = "440px";
    panel.style.maxWidth = "92vw";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";

    const title = document.createElement("h2");
    title.textContent = "Open map from server";
    title.style.cssText = "margin:0 0 12px;font-size:16px;";
    panel.appendChild(title);

    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Search by name or id…";
    search.style.cssText =
      "width:100%;box-sizing:border-box;padding:8px 10px;margin-bottom:10px;border-radius:6px;" +
      "border:1px solid #3a4150;background:#2a3140;color:#e6e6e6;font-size:14px;";
    panel.appendChild(search);

    const list = document.createElement("div");
    list.style.cssText =
      "max-height:50vh;overflow-y:auto;border:1px solid #2a3140;border-radius:6px;";
    panel.appendChild(list);

    const footer = document.createElement("div");
    footer.style.cssText =
      "display:flex;justify-content:flex-end;margin-top:12px;";
    const cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    cancel.style.cssText =
      "padding:6px 14px;border-radius:6px;border:1px solid #3a4150;background:transparent;" +
      "color:#cbd2dd;cursor:pointer;";
    cancel.addEventListener("click", () => {
      cleanup();
      reject(abortError());
    });
    footer.appendChild(cancel);
    panel.appendChild(footer);

    const all = Array.isArray(maps) ? maps.slice() : [];
    let filtered = all;
    let active = 0;

    const pad5 = (id) => String(id).padStart(5, "0");

    function applyFilter() {
      const q = search.value.trim().toLowerCase();
      filtered = q
        ? all.filter((m) => {
            const name = (m.name || "").toLowerCase();
            return (
              name.includes(q) ||
              String(m.id).includes(q) ||
              pad5(m.id).includes(q)
            );
          })
        : all;
      active = 0;
      render();
    }

    function render() {
      list.innerHTML = "";
      if (filtered.length === 0) {
        const empty = document.createElement("div");
        empty.textContent =
          all.length === 0
            ? "No maps on the server yet."
            : "No maps match your search.";
        empty.style.cssText = "padding:12px;color:#8b95a5;font-size:13px;";
        list.appendChild(empty);
        return;
      }
      filtered.slice(0, MAX_ROWS).forEach((m, i) => {
        const on = i === active;
        const row = document.createElement("div");
        row.style.cssText =
          "display:flex;align-items:baseline;justify-content:space-between;gap:12px;" +
          "padding:8px 10px;cursor:pointer;border-bottom:1px solid #232833;" +
          (on ? "background:#2f7fe0;" : "");
        const name = document.createElement("span");
        name.textContent = m.name || "(unnamed)";
        name.style.cssText =
          "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:" +
          (on ? "#ffffff" : m.name ? "#e6e6e6" : "#8b95a5") +
          (m.name ? "" : ";font-style:italic");
        const idEl = document.createElement("span");
        idEl.textContent = "#" + pad5(m.id);
        idEl.style.cssText =
          "font-family:monospace;font-size:12px;flex:none;color:" +
          (on ? "#dfe7f5" : "#8b95a5") +
          ";";
        row.appendChild(name);
        row.appendChild(idEl);
        row.addEventListener("click", () => {
          cleanup();
          resolve(m);
        });
        list.appendChild(row);
      });
      if (filtered.length > MAX_ROWS) {
        const more = document.createElement("div");
        more.textContent = `…and ${filtered.length - MAX_ROWS} more — refine your search`;
        more.style.cssText = "padding:8px 10px;color:#8b95a5;font-size:12px;";
        list.appendChild(more);
      }
      const activeEl = list.children[active];
      if (activeEl && activeEl.scrollIntoView) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }

    function onKey(e) {
      if (e.key === "Escape") {
        cleanup();
        reject(abortError());
        return;
      }
      const count = Math.min(filtered.length, MAX_ROWS);
      if (e.key === "ArrowDown") {
        if (count) {
          active = Math.min(active + 1, count - 1);
          render();
        }
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        if (count) {
          active = Math.max(active - 1, 0);
          render();
        }
        e.preventDefault();
      } else if (e.key === "Enter") {
        if (count) {
          const m = filtered[active];
          cleanup();
          resolve(m);
        }
        e.preventDefault();
      }
    }
    function cleanup() {
      document.removeEventListener("keydown", onKey);
      root.remove();
    }
    document.addEventListener("keydown", onKey);
    document.body.appendChild(root);
    render();
    search.focus();

    search.addEventListener("input", applyFilter);
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
