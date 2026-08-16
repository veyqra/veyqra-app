"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { LoaderCircle, Mic, MicOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type VoiceInputButtonProps = {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function VoiceInputButton({
  onTranscript,
  disabled = false,
}: VoiceInputButtonProps) {
  const { locale, t } = useI18n();
  const isSupported = useSyncExternalStore(
    subscribeToSpeechRecognitionSupport,
    getSpeechRecognitionSupport,
    () => false
  );
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  function toggleListening() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition =
      speechWindow.SpeechRecognition ??
      speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    setError(null);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = locale === "de" ? "de-DE" : "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcripts: string[] = [];

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];

        if (result.isFinal) {
          transcripts.push(result[0].transcript.trim());
        }
      }

      const transcript = transcripts.filter(Boolean).join(" ");

      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognition.onerror = (event) => {
      setError(t(getSpeechRecognitionError(event.error)));
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setError(t("Voice input could not be started."));
    }
  }

  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        aria-label={
          isListening
            ? t("Stop voice input")
            : t("Start voice input")
        }
        aria-pressed={isListening}
        title={
          isListening
            ? t("Stop voice input")
            : t("Start voice input")
        }
        className={`flex h-11 w-11 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-40 ${
          isListening
            ? "border-red-500/60 bg-red-500/10 text-red-300"
            : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-violet-500 hover:text-violet-300"
        }`}
      >
        {isListening ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : error ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>

      {error && (
        <div
          role="alert"
          className="absolute right-0 top-12 z-20 w-52 rounded-lg border border-red-900/60 bg-zinc-950 px-3 py-2 text-xs text-red-300 shadow-xl"
        >
          {error}
        </div>
      )}
    </div>
  );
}

function subscribeToSpeechRecognitionSupport() {
  return () => undefined;
}

function getSpeechRecognitionSupport(): boolean {
  const speechWindow = window as SpeechRecognitionWindow;

  return Boolean(
    speechWindow.SpeechRecognition ??
      speechWindow.webkitSpeechRecognition
  );
}

function getSpeechRecognitionError(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was denied.";
    case "audio-capture":
      return "No microphone is available.";
    case "no-speech":
      return "No speech was detected.";
    case "network":
      return "Voice recognition is currently unavailable.";
    default:
      return "Voice input could not be completed.";
  }
}
