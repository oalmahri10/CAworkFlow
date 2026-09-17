"use client";

import { useRef, useState } from "react";
import { Folder, Lock, Upload, Download } from "lucide-react";
import { apiUpload } from "@/lib/client/api";
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS, type DocumentCategory } from "@/lib/domain/enums";

export type DocumentWithAccess = {
  id: string;
  category: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
  uploadedAt: string;
  uploadedBy: string;
  allowed: boolean;
  reason: string;
};

export function DocumentVault({
  applicationId,
  documents,
  onUploaded,
}: {
  applicationId: string;
  documents: DocumentWithAccess[];
  onUploaded: () => void;
}) {
  const [uploadingCategory, setUploadingCategory] = useState<DocumentCategory | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleUpload(category: DocumentCategory, file: File) {
    setUploadingCategory(category);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      await apiUpload(`/api/applications/${applicationId}/documents`, form);
      onUploaded();
    } catch {
      // surfaced via alert to keep this component self-contained
      alert("Upload failed — check the category permissions and file type/size.");
    } finally {
      setUploadingCategory(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {DOCUMENT_CATEGORIES.filter((c) => c !== "OTHER").map((category) => {
        const inCategory = documents.filter((d) => d.category === category);
        const anyAllowed = inCategory.some((d) => d.allowed);
        const locked = inCategory.length > 0 && !anyAllowed;

        return (
          <div key={category} className="rounded-xl border border-black/5 p-3">
            <div className="mb-1.5 flex items-center gap-2">
              {locked ? <Lock className="h-4 w-4 text-charcoal/40" /> : <Folder className="h-4 w-4 text-primary" />}
              <span className="text-xs font-bold text-charcoal">{DOCUMENT_CATEGORY_LABELS[category]}</span>
            </div>
            <div className="text-[11px] text-charcoal/50">{inCategory.length} file(s)</div>

            {locked && inCategory[0] && (
              <p className="mt-1 text-[10px] text-charcoal/40">{inCategory[0].reason}</p>
            )}

            <ul className="mt-2 space-y-1">
              {inCategory.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="truncate" title={doc.filename}>{doc.filename} <span className="text-charcoal/40">v{doc.version}</span></span>
                  {doc.allowed ? (
                    <a
                      href={`/api/applications/${applicationId}/documents/${doc.id}`}
                      className="focus-ring shrink-0 text-primary hover:underline"
                      download
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-charcoal/30" />
                  )}
                </li>
              ))}
            </ul>

            <input
              ref={(el) => { fileInputs.current[category] = el; }}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(category, file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputs.current[category]?.click()}
              disabled={uploadingCategory === category}
              className="focus-ring mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[#e3ddee] py-1.5 text-[11px] font-semibold text-charcoal/60 hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" /> {uploadingCategory === category ? "Uploading…" : "Add"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
