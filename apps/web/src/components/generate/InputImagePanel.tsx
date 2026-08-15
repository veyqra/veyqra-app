"use client";

import {
  ImageIcon,
  Trash2,
  Upload,
} from "lucide-react";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
} from "react";

import { useGenerateStore } from "@/stores/generate-store";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

export function InputImagePanel() {
  const generationMode = useGenerateStore(
    (state) => state.generationMode
  );

  const inputImageFile = useGenerateStore(
    (state) => state.inputImageFile
  );

  const inputImageUrl = useGenerateStore(
    (state) => state.inputImageUrl
  );

  const uploadedInputFilename = useGenerateStore(
    (state) => state.uploadedInputFilename
  );

  const setInputImageFile = useGenerateStore(
    (state) => state.setInputImageFile
  );

  const setInputImageUrl = useGenerateStore(
    (state) => state.setInputImageUrl
  );

  const setUploadedInputFilename = useGenerateStore(
    (state) => state.setUploadedInputFilename
  );

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (
        inputImageUrl?.startsWith("blob:")
      ) {
        URL.revokeObjectURL(inputImageUrl);
      }
    };
  }, [inputImageUrl]);

  const previewUrl =
    inputImageUrl ??
    (uploadedInputFilename
      ? `${process.env.NEXT_PUBLIC_VEYQRA_API_URL ?? "http://localhost:8000/api/v1"}/uploads/image/${uploadedInputFilename}`
      : null);

  if (generationMode === "text_to_image") {
    return null;
  }

  function applyFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return;
    }

    if (
      inputImageUrl?.startsWith("blob:")
    ) {
      URL.revokeObjectURL(inputImageUrl);
    }

    const url = URL.createObjectURL(file);

    setInputImageFile(file);
    setInputImageUrl(url);
    setUploadedInputFilename(null);
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (file) {
      applyFile(file);
    }

    event.target.value = "";
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (file) {
      applyFile(file);
    }
  }

  function clearImage() {
    if (
      inputImageUrl?.startsWith("blob:")
    ) {
      URL.revokeObjectURL(inputImageUrl);
    }

    setInputImageFile(null);
    setInputImageUrl(null);
    setUploadedInputFilename(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-300">
            Input image
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            PNG, JPEG or WebP
          </p>
        </div>

        {(inputImageFile || uploadedInputFilename) && (
          <button
            type="button"
            onClick={clearImage}
            className="flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {previewUrl ? (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="relative min-h-[220px] bg-black sm:aspect-video sm:min-h-0">
            <img
              src={previewUrl}
              alt="Input preview"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs text-zinc-400">
                {inputImageFile?.name ?? uploadedInputFilename ?? "Input image"}
              </p>

              {inputImageFile && (
                <p className="mt-0.5 text-[11px] text-zinc-600">
                  {formatFileSize(
                    inputImageFile.size
                  )}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="shrink-0 text-xs font-medium text-violet-300 transition hover:text-violet-200"
            >
              Replace
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(event) =>
            event.preventDefault()
          }
          onDrop={handleDrop}
          onClick={() =>
            fileInputRef.current?.click()
          }
          className="cursor-pointer rounded-xl border border-dashed border-zinc-700 bg-zinc-950/60 px-4 py-8 text-center transition hover:border-violet-500/60 hover:bg-violet-500/5"
        >
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900">
            <ImageIcon className="h-5 w-5 text-zinc-500" />
          </div>

          <p className="mt-3 text-sm font-medium text-zinc-300">
            Drop an image here
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            or click to browse
          </p>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-violet-300">
            <Upload className="h-3.5 w-3.5" />
            Select image
          </div>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}
