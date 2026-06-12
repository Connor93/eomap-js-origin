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

  async _listMapIds() {
    const res = await fetch(`/api/maps`, {
      headers: { Authorization: `Bearer ${this._getToken()}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to list maps (HTTP ${res.status})`);
    }
    const body = await res.json();
    return Array.isArray(body.ids) ? body.ids : [];
  }

  async showOpenFilePicker(_options) {
    const ids = await this._listMapIds();
    const mapId = await openServerMapDialog(ids); // rejects AbortError on cancel
    return [new ServerFileSystemFileHandle(this._getToken, mapId)];
  }

  async showSaveFilePicker(_options) {
    const ids = await this._listMapIds();
    const mapId = await saveServerMapDialog(ids); // rejects AbortError on cancel
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
