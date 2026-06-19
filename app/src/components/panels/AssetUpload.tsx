import { useRef, useState } from "react";
import { ApiError, uploadAsset } from "../../lib/api.js";
import { useEditorStore } from "../../store/editor.js";

/** Small file-picker button that uploads an image and returns its public URL. */
export function AssetUpload({
  onUploaded,
  label = "Upload image",
}: {
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const workspaceId = useEditorStore((s) => s.workspaceId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;
    setBusy(true);
    setError(null);
    try {
      const asset = await uploadAsset(workspaceId, file);
      onUploaded(asset.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handle} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full rounded-md border border-dashed border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50"
      >
        {busy ? "Uploading…" : `⬆ ${label}`}
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
