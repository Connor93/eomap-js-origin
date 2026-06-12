// A map handle backed by the AIO backend over HTTP. getToken is a function so
// a rotated token is always picked up at fetch time. All URLs are relative —
// the iframe is same-origin with the AIO app, so they resolve correctly in
// both dev (Vite proxy) and prod (nginx).
export class ServerFileSystemFileHandle {
  constructor(getToken, mapId, name) {
    this._getToken = getToken;
    this.mapId = mapId;
    this.name = name || `${String(mapId).padStart(5, "0")}.emf`;
  }

  async getFile() {
    const res = await fetch(`/api/maps/${this.mapId}`, {
      headers: { Authorization: `Bearer ${this._getToken()}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to load map ${this.mapId} (HTTP ${res.status})`);
    }
    const buffer = await res.arrayBuffer();
    const name = this.name;
    // eomap-js only calls file.arrayBuffer() and reads file.name.
    return {
      name,
      async arrayBuffer() {
        return buffer;
      },
    };
  }

  async write(data) {
    const form = new FormData();
    form.append("map_id", String(this.mapId));
    form.append("file", new Blob([data]), this.name);
    const res = await fetch(`/api/maps/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this._getToken()}` },
      body: form,
    });
    if (!res.ok) {
      let message = `Failed to save map ${this.mapId} (HTTP ${res.status})`;
      try {
        const body = await res.json();
        if (body && body.error) message = body.error;
      } catch {
        // non-JSON body — keep generic message
      }
      throw new Error(message);
    }
  }

  async queryPermission() {
    return "granted";
  }

  async requestPermission() {
    return "granted";
  }

  isSameEntry(other) {
    return !!other && other.mapId === this.mapId;
  }
}
