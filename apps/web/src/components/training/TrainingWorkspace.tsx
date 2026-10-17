"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Ban, CheckCircle2, FileUp, LoaderCircle, Play, RefreshCw } from "lucide-react";

import { cancelTrainingJob, createTrainingDataset, createTrainingJob, listTrainingDatasetImages, listTrainingDatasets, listTrainingJobs } from "@/services/training-api";
import type { TrainingDataset, TrainingDatasetImage, TrainingJob } from "@/types/training";
import { toSameOriginApiUrl } from "@/lib/api-resource-url";
import { useI18n } from "@/lib/i18n";

const initialForm = { name: "", baseModel: "", networkRank: 16, learningRate: 0.0001, maxTrainSteps: 1000, batchSize: 1 };

export function TrainingWorkspace() {
  const { t } = useI18n();
  const [datasets, setDatasets] = useState<TrainingDataset[]>([]);
  const [datasetImages, setDatasetImages] = useState<TrainingDatasetImage[]>([]);
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [datasetId, setDatasetId] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<string[]>([]);
  const pendingPreviewUrlsRef = useRef<string[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [nextDatasets, nextJobs] = await Promise.all([listTrainingDatasets(), listTrainingJobs()]);
    setDatasets(nextDatasets);
    setJobs(nextJobs);
    setDatasetId((current) => current || nextDatasets[0]?.id || "");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
        .catch((reason) =>
          setError(
            reason instanceof Error
              ? reason.message
              : t("Training data could not be loaded.")
          )
        )
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load, t]);
  useEffect(() => {
    if (!datasetId) {
      return;
    }

    const timer = window.setTimeout(() => {
      void listTrainingDatasetImages(datasetId)
        .then(setDatasetImages)
        .catch((reason) =>
          setError(
            reason instanceof Error
              ? reason.message
              : t("Dataset preview could not be loaded.")
          )
        );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [datasetId, t]);
  useEffect(() => () => {
    pendingPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  useEffect(() => {
    if (!jobs.some((job) => job.status === "queued" || job.status === "running")) return;
    const interval = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(interval);
  }, [jobs, load]);

  async function uploadDataset() {
    if (!datasetName.trim() || files.length === 0) return;
    setSubmitting(true); setError(null);
    try {
      const dataset = await createTrainingDataset(datasetName, files);
      setDatasets((current) => [dataset, ...current]); setDatasetId(dataset.id); setDatasetImages([]); setDatasetName(""); setFiles([]); clearPendingPreviews();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("Dataset upload failed.")); }
    finally { setSubmitting(false); }
  }

  function clearPendingPreviews() {
    pendingPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    pendingPreviewUrlsRef.current = [];
    setPendingPreviewUrls([]);
  }

  function selectFiles(nextFiles: File[]) {
    clearPendingPreviews();
    const urls = nextFiles.map((file) => URL.createObjectURL(file));
    pendingPreviewUrlsRef.current = urls;
    setFiles(nextFiles);
    setPendingPreviewUrls(urls);
  }

  async function startTraining() {
    if (!datasetId || !form.name.trim() || !form.baseModel.trim()) return;
    setSubmitting(true); setError(null);
    try {
      const job = await createTrainingJob({ ...form, name: form.name.trim(), baseModel: form.baseModel.trim(), datasetId });
      setJobs((current) => [job, ...current]); setForm(initialForm);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("Training could not be started.")); }
    finally { setSubmitting(false); }
  }

  async function cancel(id: string) {
    try { const job = await cancelTrainingJob(id); setJobs((current) => current.map((item) => item.id === id ? job : item)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("Training could not be cancelled.")); }
  }

  return <div className="space-y-6">
    {error && <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-lg font-semibold text-white">{t("Dataset")}</h2><p className="mt-1 text-sm text-zinc-500">{t("Upload the reference images for your LoRA.")}</p>
        <label className="mt-5 block text-sm text-zinc-300">{t("Dataset name")}<input value={datasetName} onChange={(event) => setDatasetName(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 outline-none focus:border-violet-500" placeholder="Mein Charakter" /></label>
        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-950 px-4 py-7 text-sm text-zinc-400 hover:border-violet-500"><FileUp className="h-5 w-5" />{files.length ? t(files.length === 1 ? "{count} image selected" : "{count} images selected", { count: files.length }) : t("Choose PNG, JPEG, or WebP images")}<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => selectFiles(Array.from(event.target.files ?? []))} /></label>
        {pendingPreviewUrls.length > 0 && <div className="mt-4"><h3 className="text-sm font-medium text-zinc-200">{t("Selected images")}</h3><div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">{pendingPreviewUrls.map((url, index) => <img key={url} src={url} alt={`${t("Selected images")} ${index + 1}`} className="aspect-square rounded-lg object-cover ring-1 ring-zinc-800" />)}</div></div>}
        <button type="button" disabled={submitting || !datasetName.trim() || files.length === 0} onClick={() => void uploadDataset()} className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50">{t("Upload dataset")}</button>
        <div className="mt-5 space-y-2">{datasets.map((dataset) => <button type="button" key={dataset.id} onClick={() => setDatasetId(dataset.id)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm ${dataset.id === datasetId ? "border-violet-500 bg-violet-500/10" : "border-zinc-800 bg-zinc-950"}`}><span className="text-zinc-200">{dataset.name}</span><span className="text-xs text-zinc-500">{t("{count} images", { count: dataset.imageCount })}</span></button>)}{!loading && datasets.length === 0 && <p className="py-3 text-sm text-zinc-600">{t("No datasets yet.")}</p>}</div>
        {datasetId && <div className="mt-5 border-t border-zinc-800 pt-5"><div className="flex items-center justify-between"><h3 className="text-sm font-medium text-zinc-200">{t("Dataset preview")}</h3><span className="text-xs text-zinc-500">{t("{count} images", { count: datasetImages.length })}</span></div>{datasetImages.length > 0 ? <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">{datasetImages.map((image) => <a key={image.filename} href={toSameOriginApiUrl(image.imageUrl)} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg bg-zinc-950 ring-1 ring-zinc-800 hover:ring-violet-500"><img src={toSameOriginApiUrl(image.imageUrl)} alt={image.filename} className="h-full w-full object-cover" /></a>)}</div> : <p className="mt-3 text-xs text-zinc-600">{t("No preview images available.")}</p>}</div>}
      </section>
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-lg font-semibold text-white">{t("New LoRA training")}</h2><p className="mt-1 text-sm text-zinc-500">{t("AI Toolkit runs locally and keeps outputs in Veyqra.")}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><Field label={t("LoRA name")} value={form.name} onChange={(name) => setForm((current) => ({ ...current, name }))} placeholder="mein-charakter" /><Field label={t("Base model path")} value={form.baseModel} onChange={(baseModel) => setForm((current) => ({ ...current, baseModel }))} placeholder="C:\\models\\sdxl.safetensors" /></div>
        <div className="mt-4 grid gap-4 md:grid-cols-3"><NumberField label={t("Network rank")} value={form.networkRank} onChange={(networkRank) => setForm((current) => ({ ...current, networkRank }))} /><NumberField label={t("Steps")} value={form.maxTrainSteps} onChange={(maxTrainSteps) => setForm((current) => ({ ...current, maxTrainSteps }))} /><NumberField label={t("Batch size")} value={form.batchSize} onChange={(batchSize) => setForm((current) => ({ ...current, batchSize }))} /></div>
        <label className="mt-4 block text-sm text-zinc-300">{t("Learning rate")}<input type="number" step="0.00001" min="0.00001" value={form.learningRate} onChange={(event) => setForm((current) => ({ ...current, learningRate: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 outline-none focus:border-violet-500" /></label>
        <button type="button" disabled={submitting || !datasetId || !form.name.trim() || !form.baseModel.trim()} onClick={() => void startTraining()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"><Play className="h-4 w-4" />{t("Start training")}</button>
      </section>
    </div>
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">{t("Training jobs")}</h2><p className="mt-1 text-sm text-zinc-500">{t("Live output is retained with each job.")}</p></div><button type="button" onClick={() => void load()} className="rounded-lg border border-zinc-800 p-2 text-zinc-400 hover:text-white"><RefreshCw className="h-4 w-4" /></button></div><div className="mt-5 space-y-3">{jobs.map((job) => <JobRow key={job.id} job={job} onCancel={cancel} />)}{!loading && jobs.length === 0 && <p className="py-8 text-center text-sm text-zinc-600">{t("No training jobs yet.")}</p>}{loading && <LoaderCircle className="mx-auto my-8 h-6 w-6 animate-spin text-violet-400" />}</div></section>
  </div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <label className="block text-sm text-zinc-300">{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 outline-none focus:border-violet-500" /></label>; }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="block text-sm text-zinc-300">{label}<input type="number" min="1" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 outline-none focus:border-violet-500" /></label>; }
function JobRow({ job, onCancel }: { job: TrainingJob; onCancel: (id: string) => Promise<void> }) { const { t } = useI18n(); const active = job.status === "queued" || job.status === "running"; const statusLabel = job.status === "queued" ? t("Queued") : job.status === "running" ? t("Running") : job.status === "completed" ? t("Completed") : job.status === "failed" ? t("Failed") : t("Cancelled"); return <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><div className="flex gap-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-xs ${job.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : job.status === "failed" ? "bg-red-500/10 text-red-400" : "bg-violet-500/10 text-violet-300"}`}>{statusLabel}</span><p className="truncate font-medium text-white">{job.name}</p></div><p className="mt-2 truncate text-xs text-zinc-500">{job.baseModel}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-violet-500" style={{ width: `${job.progress}%` }} /></div>{job.error && <p className="mt-2 text-xs text-red-400">{job.error}</p>}{job.outputFilename && <a href={`/api/v1/training/jobs/${job.id}/download`} className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />{t("Download")} {job.outputFilename}</a>}</div>{active && <button type="button" onClick={() => void onCancel(job.id)} aria-label={t("Cancel")} className="self-start rounded-lg border border-red-900/60 p-2 text-red-300"><Ban className="h-4 w-4" /></button>}</div></article>; }
