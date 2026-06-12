import { ServerFileSystemFileHandle } from "./server-file-system-file-handle";
import { openServerMapDialog, saveServerMapDialog } from "./server-map-dialog";

// FileSystemProvider implementation backed by the AIO backend. Maps are picked
// from the server (not the OS file dialog) and saved direct-to-live.
export class ServerFileSystemProvider {
  constructor(getToken) {
    this._getToken = getToken;
  }

  get supported() {
    return true;
  }

  // Returns the server's maps as [{ id, name }]. `maps` carries names; older
  // backends return only `ids` — fall back to names of null in that case.
  async _listMaps() {
    const res = await fetch(`/api/maps`, {
      headers: { Authorization: `Bearer ${this._getToken()}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to list maps (HTTP ${res.status})`);
    }
    const body = await res.json();
    if (Array.isArray(body.maps)) {
      return body.maps;
    }
    if (Array.isArray(body.ids)) {
      return body.ids.map((id) => ({ id, name: null }));
    }
    return [];
  }

  async showOpenFilePicker(_options) {
    const maps = await this._listMaps();
    const choice = await openServerMapDialog(maps); // {id, name}; rejects AbortError on cancel
    return [
      new ServerFileSystemFileHandle(
        this._getToken,
        choice.id,
        choice.name || undefined,
      ),
    ];
  }

  async showSaveFilePicker(_options) {
    const maps = await this._listMaps();
    const mapId = await saveServerMapDialog(maps.map((m) => m.id)); // rejects AbortError on cancel
    return new ServerFileSystemFileHandle(this._getToken, mapId);
  }

  async showDirectoryPicker(_options) {
    throw new Error(
      "Directory picking is not available in the embedded editor.",
    );
  }

  async dataTransferItemToHandle(_dataTransferItem) {
    throw new Error("Drag-and-drop is not available in the embedded editor.");
  }

  serializeHandle(handle) {
    return { mapId: handle.mapId, name: handle.name };
  }

  deserializeHandle(serialized) {
    return new ServerFileSystemFileHandle(
      this._getToken,
      serialized.mapId,
      serialized.name,
    );
  }
}
