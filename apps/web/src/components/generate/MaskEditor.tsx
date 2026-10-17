"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { useGenerateStore } from "@/stores/generate-store";
import { useI18n } from "@/lib/i18n";

export function MaskEditor({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) {
  const { t } = useI18n();
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = useRef({ width: 0, height: 0 });
  const previous = useRef<{ x: number; y: number } | null>(null);
  const [eraser, setEraser] = useState(false);
  const [brush, setBrush] = useState(40);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [undo, setUndo] = useState<string[]>([]);
  const button = "rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:border-violet-500 disabled:opacity-40";

  function restore(url: string) {
    setReady(false);
    const image = new Image();
    image.onload = () => {
      const target = canvas.current;
      if (!target) return;
      const ctx = target.getContext("2d")!;
      ctx.clearRect(0, 0, target.width, target.height);
      ctx.drawImage(image, 0, 0, target.width, target.height);
      setReady(true);
    };
    image.src = url;
  }

  function paint(event: PointerEvent<HTMLCanvasElement>, first = false) {
    const target = canvas.current;
    if (!target || !ready || (!first && !previous.current)) return;
    const rect = target.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) * target.width / rect.width, y: (event.clientY - rect.top) * target.height / rect.height };
    const ctx = target.getContext("2d")!;
    const radius = brush * target.width / size.current.width / 2;
    ctx.globalCompositeOperation = eraser ? "destination-out" : "source-over";
    ctx.strokeStyle = ctx.fillStyle = "#a855f7";
    ctx.lineWidth = radius * 2;
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.beginPath();
    if (first) { ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.moveTo(previous.current!.x, previous.current!.y); ctx.lineTo(point.x, point.y); ctx.stroke(); }
    ctx.globalCompositeOperation = "source-over";
    previous.current = point;
  }

  function apply() {
    const target = canvas.current;
    if (!target || !ready) return;
    const pixels = target.getContext("2d")!.getImageData(0, 0, target.width, target.height);
    let painted = false;
    for (let index = 0; index < pixels.data.length; index += 4) {
      const alpha = pixels.data[index + 3];
      if (alpha) painted = true;
      pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = alpha;
      pixels.data[index + 3] = 255;
    }
    if (!painted) { setError(t("Paint an area to edit first.")); return; }
    const small = document.createElement("canvas");
    small.width = target.width; small.height = target.height;
    small.getContext("2d")!.putImageData(pixels, 0, 0);
    const output = document.createElement("canvas");
    output.width = size.current.width; output.height = size.current.height;
    output.getContext("2d")!.drawImage(small, 0, 0, output.width, output.height);
    useGenerateStore.getState().setManualMask(output.toDataURL("image/png"));
    onClose();
  }

  return <Modal label={t("Edit inpaint mask")} onClose={onClose}>
    <div className="mx-auto max-w-5xl space-y-4">
      <h2 className="text-xl font-semibold">{t("Edit inpaint mask")}</h2>
      <p className="text-sm text-zinc-400">{t("Paint the area to change. Unpainted areas are preserved.")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button className={button} type="button" aria-pressed={!eraser} onClick={() => setEraser(false)}>{t("Brush")}</button>
        <button className={button} type="button" aria-pressed={eraser} onClick={() => setEraser(true)}>{t("Eraser")}</button>
        <label className="flex items-center gap-2 text-sm">{t("Brush size")}: {brush}px<input type="range" min="5" max="200" value={brush} onChange={(e) => setBrush(Number(e.target.value))} /></label>
        <button className={button} type="button" disabled={!ready || !undo.length} onClick={() => { restore(undo[undo.length - 1]); setUndo((values) => values.slice(0, -1)); }}>{t("Undo")}</button>
        <button className={button} type="button" disabled={!ready} onClick={() => {
          const target = canvas.current!;
          setUndo((values) => [...values.slice(-9), target.toDataURL()]);
          target.getContext("2d")!.clearRect(0, 0, target.width, target.height);
        }}>{t("Clear mask")}</button>
      </div>
      <div className="flex justify-center overflow-auto rounded-xl border border-zinc-700 bg-black p-2">
        <div className="relative inline-block max-w-full">
          <img src={imageUrl} alt={t("Input preview")} className="block max-h-[65vh] max-w-full object-contain" onError={() => setError(t("Unable to load the input image."))} onLoad={(event) => {
            const image = event.currentTarget;
            size.current = { width: image.naturalWidth, height: image.naturalHeight };
            const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
            const target = canvas.current!;
            target.width = Math.round(image.naturalWidth * scale); target.height = Math.round(image.naturalHeight * scale);
            const saved = useGenerateStore.getState().manualMask;
            if (saved) {
              const mask = new Image();
              mask.onload = () => {
                if (!canvas.current) return;
                const ctx = target.getContext("2d")!;
                ctx.drawImage(mask, 0, 0, target.width, target.height);
                const pixels = ctx.getImageData(0, 0, target.width, target.height);
                for (let i = 0; i < pixels.data.length; i += 4) {
                  const alpha = pixels.data[i];
                  pixels.data[i] = 168; pixels.data[i + 1] = 85; pixels.data[i + 2] = 247; pixels.data[i + 3] = alpha;
                }
                ctx.putImageData(pixels, 0, 0); setReady(true);
              };
              mask.src = saved;
            } else setReady(true);
          }} />
          <canvas ref={canvas} aria-label={t("Mask drawing area")} className="absolute inset-0 h-full w-full touch-none opacity-60" style={{ cursor: "crosshair" }} onPointerDown={(event) => {
            if (!ready || event.button !== 0 || previous.current) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            // React clears currentTarget after dispatch. Capture the pixels
            // now, before the state updater is executed.
            const snapshot = event.currentTarget.toDataURL();
            setUndo((values) => [...values.slice(-9), snapshot]);
            paint(event, true);
          }} onPointerMove={(event) => paint(event)} onPointerUp={() => { previous.current = null; }} onPointerCancel={() => { previous.current = null; }} onLostPointerCapture={() => { previous.current = null; }} />
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" className={button} onClick={onClose}>{t("Cancel")}</button>
        <button type="button" className={`${button} bg-violet-600`} disabled={!ready} onClick={apply}>{t("Apply mask")}</button>
      </div>
    </div>
  </Modal>;
}
