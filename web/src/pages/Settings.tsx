import { useEffect, useState } from "react";
import { api, type SettingsResponse } from "../api/client";

function joinPath(base: string, entry: string): string {
  const sep = base.includes("\\") ? "\\" : "/";
  return base.endsWith(sep) ? `${base}${entry}` : `${base}${sep}${entry}`;
}

export function Settings() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [browsePath, setBrowsePath] = useState<string | null>(null);
  const [entries, setEntries] = useState<string[]>([]);
  const [parent, setParent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refreshSettings = () => api.getSettings().then(setSettings);

  useEffect(() => {
    refreshSettings();
  }, []);

  const browse = (dirPath: string | undefined) => {
    api.browseDirectory(dirPath).then((res) => {
      setBrowsePath(res.path);
      setEntries(res.entries);
      setParent(res.parent);
      setError(res.error ?? null);
    });
  };

  const openModal = () => {
    setModalOpen(true);
    browse(settings?.historyFolder ?? undefined);
  };

  const chooseFolder = async () => {
    if (!browsePath) return;
    setSaving(true);
    try {
      await api.setSettings(browsePath);
      await refreshSettings();
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>Settings</h1>

      <h2>Run history folder</h2>
      <p className="hint">
        The folder STS2 writes <code>.run</code> files to. New runs dropped here are picked up
        automatically without restarting the app.
      </p>
      <p>
        Current folder: <code>{settings?.historyFolder ?? "not set"}</code>{" "}
        {settings?.historyFolder && (settings.exists ? "(found)" : "(not found — pick a new one)")}
      </p>
      <button onClick={openModal}>Select folder…</button>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Select run history folder</h3>
            <p className="hint">{browsePath ?? "Choose a drive"}</p>
            {error && <p className="error">{error}</p>}
            <div className="dir-list">
              {parent !== null && (
                <div className="dir-entry" onClick={() => browse(parent)}>
                  .. (up)
                </div>
              )}
              {entries.map((entry) => (
                <div
                  key={entry}
                  className="dir-entry"
                  onClick={() => browse(browsePath ? joinPath(browsePath, entry) : entry)}
                >
                  {entry}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setModalOpen(false)}>Cancel</button>
              <button onClick={chooseFolder} disabled={!browsePath || saving}>
                {saving ? "Saving…" : "Use this folder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
