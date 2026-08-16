"use client";

import { Brush, ImageIcon, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { useGenerateStore } from "@/stores/generate-store";
import type { GenerationMode } from "@/types/generate";
import { useI18n } from "@/lib/i18n";

type InputMode = Exclude<GenerationMode, "text_to_image">;

type ImageReuseActionsProps = {
  imageId: string;
  imageUrl: string;
  className?: string;
  onPrepared?: (mode: InputMode) => void;
  onError?: (message: string) => void;
};

export function ImageReuseActions({
  imageId,
  imageUrl,
  className = "",
  onPrepared,
  onError,
}: ImageReuseActionsProps) {
  const { t } = useI18n();
  const [pendingMode, setPendingMode] =
    useState<InputMode | null>(null);
  const prepareHistoryImage = useGenerateStore(
    (state) => state.prepareHistoryImage
  );
  const setGenerationError = useGenerateStore(
    (state) => state.setGenerationError
  );

  async function prepare(mode: InputMode) {
    if (pendingMode) {
      return;
    }

    setPendingMode(mode);
    setGenerationError(null);

    try {
      await prepareHistoryImage(imageId, imageUrl, mode);
      onPrepared?.(mode);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("Unable to prepare the image.");

      setGenerationError(message);
      onError?.(message);
    } finally {
      setPendingMode(null);
    }
  }

  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => void prepare("image_to_image")}
        disabled={pendingMode !== null}
        className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 transition hover:border-violet-500 hover:text-violet-200 disabled:cursor-wait disabled:opacity-50"
      >
        {pendingMode === "image_to_image" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
        {t("Image to Image")}
      </button>

      <button
        type="button"
        onClick={() => void prepare("inpaint")}
        disabled={pendingMode !== null}
        className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 transition hover:border-violet-500 hover:text-violet-200 disabled:cursor-wait disabled:opacity-50"
      >
        {pendingMode === "inpaint" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Brush className="h-4 w-4" />
        )}
        {t("Inpaint")}
      </button>
    </div>
  );
}
