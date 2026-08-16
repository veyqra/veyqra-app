"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "de" | "en";
export type LanguagePreference = Locale | "system";

const LANGUAGE_COOKIE = "veyqra-language";

const de = {
  Dashboard: "Übersicht",
  Generate: "Generieren",
  Jobs: "Aufträge",
  Train: "Trainieren",
  Models: "Modelle",
  History: "Verlauf",
  Cloud: "Cloud",
  Marketplace: "Marktplatz",
  Settings: "Einstellungen",
  Soon: "Bald",
  Version: "Version",
  "Welcome back to Veyqra": "Willkommen zurück bei Veyqra",
  "Create images with Veyqra": "Bilder mit Veyqra erstellen",
  "Train and manage LoRAs": "LoRAs trainieren und verwalten",
  "Manage models and LoRAs": "Modelle und LoRAs verwalten",
  "Browse previous generations": "Frühere Generierungen ansehen",
  "Monitor generation jobs": "Generierungsaufträge überwachen",
  "Manage cloud compute": "Cloud-Rechenleistung verwalten",
  "Configure your Veyqra workstation": "Deine Veyqra-Workstation konfigurieren",
  "Create. Train. Deploy.": "Erstellen. Trainieren. Bereitstellen.",
  "Open navigation": "Navigation öffnen",
  "Close navigation": "Navigation schließen",
  Navigation: "Navigation",
  "Show local system status": "Lokalen Systemstatus anzeigen",
  Local: "Lokal",
  "Show AWS cloud status": "AWS-Cloudstatus anzeigen",
  Notifications: "Benachrichtigungen",
  "Open account menu": "Benutzermenü öffnen",
  Account: "Benutzerkonto",
  Language: "Sprache",
  System: "System",
  German: "Deutsch",
  English: "Englisch",
  "Follow browser language": "Browsersprache verwenden",
  "System status": "Systemstatus",
  "Veyqra local runtime": "Lokale Veyqra-Laufzeit",
  "Close system status": "Systemstatus schließen",
  Online: "Online",
  Offline: "Offline",
  "No GPU detected": "Keine GPU erkannt",
  "Local compute": "Lokale Rechenleistung",
  used: "belegt",
  Running: "Läuft",
  Queued: "Wartet",
  "AWS cloud status": "AWS-Cloudstatus",
  "Bring your own AWS account": "Eigenes AWS-Konto verwenden",
  "Close cloud status": "Cloudstatus schließen",
  "AWS account": "AWS-Konto",
  Connected: "Verbunden",
  "Not connected": "Nicht verbunden",
  Credentials: "Zugangsdaten",
  Available: "Verfügbar",
  "Not configured": "Nicht konfiguriert",
  "EC2 instances": "EC2-Instanzen",
  "Not available": "Nicht verfügbar",
  "AWS connection and instance management will be added with the backend integration.":
    "AWS-Verbindung und Instanzverwaltung folgen mit der Backend-Integration.",
  "Close notifications": "Benachrichtigungen schließen",
  "You are all caught up": "Alles ist auf dem neuesten Stand",
  "Mark all read": "Alle als gelesen markieren",
  Clear: "Leeren",
  "No notifications": "Keine Benachrichtigungen",
  "Job updates will appear here.": "Statusänderungen von Aufträgen erscheinen hier.",
  "Remove notification": "Benachrichtigung entfernen",
  "Generation completed": "Generierung abgeschlossen",
  "Your image is ready.": "Dein Bild ist fertig.",
  "Generation failed": "Generierung fehlgeschlagen",
  "The generation could not be completed.": "Die Generierung konnte nicht abgeschlossen werden.",
  "Generation cancelled": "Generierung abgebrochen",
  "The generation was cancelled.": "Die Generierung wurde abgebrochen.",
  "Create images locally or with your selected cloud provider.":
    "Erstelle Bilder lokal oder mit deinem ausgewählten Cloud-Anbieter.",
  "Browse and manage images generated with Veyqra.":
    "Mit Veyqra generierte Bilder ansehen und verwalten.",
  "Browse diffusion models and LoRAs available in your local ComfyUI installation.":
    "Diffusionsmodelle und LoRAs deiner lokalen ComfyUI-Installation durchsuchen.",
  "Generation settings": "Generierungseinstellungen",
  "Configure the prompt, model and output parameters.":
    "Prompt, Modell und Ausgabeparameter konfigurieren.",
  "Generation mode": "Generierungsmodus",
  "Text to Image": "Text zu Bild",
  "Image to Image": "Bild zu Bild",
  Inpaint: "Inpainting",
  "Generate an image from a prompt.": "Ein Bild aus einem Prompt generieren.",
  "Transform an existing image.": "Ein vorhandenes Bild verändern.",
  "Replace selected areas of an image.": "Ausgewählte Bildbereiche ersetzen.",
  Prompt: "Prompt",
  "Positive prompt": "Positiver Prompt",
  "Negative prompt": "Negativer Prompt",
  "Mask prompt": "Masken-Prompt",
  Optional: "Optional",
  "Describe the image you want to generate...": "Beschreibe das Bild, das du generieren möchtest …",
  "Describe how the selected area should change...": "Beschreibe, wie sich der ausgewählte Bereich ändern soll …",
  "Describe elements that should not appear...": "Beschreibe Elemente, die nicht erscheinen sollen …",
  "e.g. red shirt, face, background": "z. B. rotes Shirt, Gesicht, Hintergrund",
  "Leave empty to detect the mask area automatically from the positive prompt.":
    "Leer lassen, um den Maskenbereich automatisch aus dem positiven Prompt zu erkennen.",
  characters: "Zeichen",
  Parameters: "Parameter",
  Model: "Modell",
  "Selected model": "Ausgewähltes Modell",
  "No models available": "Keine Modelle verfügbar",
  "Loading models...": "Modelle werden geladen …",
  "No models found": "Keine Modelle gefunden",
  Recommended: "Empfohlen",
  Unclassified: "Nicht klassifiziert",
  Reset: "Zurücksetzen",
  "No compatible LoRAs found for": "Keine kompatiblen LoRAs gefunden für",
  "Refresh models": "Modelle aktualisieren",
  "No LoRA": "Kein LoRA",
  "LoRA strength": "LoRA-Stärke",
  "Controls how strongly the LoRA influences the model.": "Steuert, wie stark das LoRA das Modell beeinflusst.",
  "Active LoRA": "Aktives LoRA",
  Resolution: "Auflösung",
  "Original image size": "Originalgröße des Bildes",
  "Denoise strength": "Denoise-Stärke",
  "Lower values preserve more of the input image.": "Niedrigere Werte bewahren mehr vom Eingabebild.",
  Preserve: "Bewahren",
  Transform: "Verändern",
  "Grow mask": "Maske erweitern",
  "Expands the detected mask to blend the edited edges.": "Erweitert die erkannte Maske, damit bearbeitete Kanten besser überblendet werden.",
  Steps: "Schritte",
  Guidance: "Guidance",
  Sampler: "Sampler",
  Scheduler: "Scheduler",
  Seed: "Seed",
  Random: "Zufällig",
  Locked: "Gesperrt",
  Fixed: "Fest",
  "Generate random seed": "Zufälligen Seed erzeugen",
  "Unlock seed": "Seed entsperren",
  "Lock seed": "Seed sperren",
  "Batch size": "Stapelgröße",
  "Use random seed": "Zufälligen Seed verwenden",
  "Generation summary": "Zusammenfassung",
  "Reading model catalog from ComfyUI...": "Modellkatalog wird aus ComfyUI gelesen …",
  None: "Keine",
  Unknown: "Unbekannt",
  "Text → Image": "Text → Bild",
  "Image → Image": "Bild → Bild",
  Preview: "Vorschau",
  "The latest generated image appears here.": "Das zuletzt generierte Bild erscheint hier.",
  "Input image": "Eingabebild",
  "Input preview": "Eingabevorschau",
  Remove: "Entfernen",
  Replace: "Ersetzen",
  "Drop an image here": "Bild hier ablegen",
  "or click to browse": "oder zum Auswählen klicken",
  "Select image": "Bild auswählen",
  Download: "Herunterladen",
  "Generated preview": "Generierte Vorschau",
  "Show previous history image": "Vorheriges Bild anzeigen",
  "Show next history image": "Nächstes Bild anzeigen",
  "No image generated": "Noch kein Bild generiert",
  "Configure your settings, enter a prompt and start a generation.":
    "Konfiguriere die Einstellungen, gib einen Prompt ein und starte die Generierung.",
  "Detected mask": "Erkannte Maske",
  "Auto segmentation": "Automatische Segmentierung",
  "Detected area:": "Erkannter Bereich:",
  "Detected inpaint mask": "Erkannte Inpainting-Maske",
  Queue: "Warteschlange",
  "Generation jobs and their progress.": "Generierungsaufträge und ihr Fortschritt.",
  "Clear queue": "Warteschlange leeren",
  "No active jobs": "Keine aktiven Aufträge",
  "Remove job": "Auftrag entfernen",
  "Adding to queue...": "Wird zur Warteschlange hinzugefügt …",
  "Cancel latest job": "Letzten Auftrag abbrechen",
  "Select an input image before generating.": "Wähle vor der Generierung ein Eingabebild aus.",
  "Unable to monitor generation.": "Die Generierung konnte nicht überwacht werden.",
  "Unable to cancel generation.": "Die Generierung konnte nicht abgebrochen werden.",
  "Generation polling timed out": "Zeitüberschreitung bei der Generierungsüberwachung",
  "1 job waiting in ComfyUI...": "1 Auftrag wartet in ComfyUI …",
  "1 job generating...": "1 Auftrag wird generiert …",
  "Dismiss error": "Fehler schließen",
  "Generation history": "Generierungsverlauf",
  "Recently generated images in this session.": "Kürzlich in dieser Sitzung generierte Bilder.",
  "No images yet": "Noch keine Bilder",
  "Unable to prepare the image.": "Das Bild konnte nicht vorbereitet werden.",
  "Search history...": "Verlauf durchsuchen …",
  "Loading generation history...": "Generierungsverlauf wird geladen …",
  "No generation history found.": "Kein Generierungsverlauf gefunden.",
  Reuse: "Wiederverwenden",
  "Generation details": "Generierungsdetails",
  Close: "Schließen",
  Strength: "Stärke",
  "Send to Generate": "An Generieren senden",
  Refresh: "Aktualisieren",
  "Delete the complete generation history?": "Den gesamten Generierungsverlauf löschen?",
  "Delete history item": "Eintrag aus dem Verlauf löschen",
  "Search jobs...": "Aufträge durchsuchen …",
  "Monitor local generation jobs and queue activity.": "Lokale Generierungsaufträge und Warteschlange überwachen.",
  "Loading generation jobs...": "Generierungsaufträge werden geladen …",
  "No generation jobs found.": "Keine Generierungsaufträge gefunden.",
  Total: "Gesamt",
  Active: "Aktiv",
  Completed: "Abgeschlossen",
  Failed: "Fehlgeschlagen",
  Cancel: "Abbrechen",
  Cancelled: "Abgebrochen",
  Progress: "Fortschritt",
  Created: "Erstellt",
  "Search models and LoRAs...": "Modelle und LoRAs durchsuchen …",
  "All families": "Alle Familien",
  "Diffusion models": "Diffusionsmodelle",
  "Diffusion Models": "Diffusionsmodelle",
  "Base diffusion models available to ComfyUI.": "Für ComfyUI verfügbare Basis-Diffusionsmodelle.",
  LoRAs: "LoRAs",
  "LoRA adapters available to ComfyUI.": "Für ComfyUI verfügbare LoRA-Adapter.",
  "Loading ComfyUI models...": "ComfyUI-Modelle werden geladen …",
  "No matching models found.": "Keine passenden Modelle gefunden.",
  Specialized: "Spezialisiert",
  "Quick Actions": "Schnellaktionen",
  "Veyqra workstation overview.": "Übersicht deiner Veyqra-Workstation.",
  "Recent jobs": "Letzte Aufträge",
  "Latest generation activity.": "Letzte Generierungsaktivitäten.",
  "No generation jobs yet.": "Noch keine Generierungsaufträge.",
  "Quick actions": "Schnellaktionen",
  "Common Veyqra workflows.": "Häufig verwendete Veyqra-Abläufe.",
  "base": "Basis",
  "completed": "abgeschlossen",
  "Generate image": "Bild generieren",
  "Start a new local generation.": "Eine neue lokale Generierung starten.",
  "View jobs": "Aufträge anzeigen",
  "Monitor generation jobs.": "Generierungsaufträge überwachen.",
  "Manage models": "Modelle verwalten",
  "Browse available models and LoRAs.": "Verfügbare Modelle und LoRAs durchsuchen.",
  "Active Jobs": "Aktive Aufträge",
  "Local backend": "Lokales Backend",
  "ComfyUI device": "ComfyUI-Gerät",
  "Start voice input": "Spracheingabe starten",
  "Stop voice input": "Spracheingabe stoppen",
  "Microphone access was denied.": "Der Mikrofonzugriff wurde verweigert.",
  "No microphone is available.": "Es ist kein Mikrofon verfügbar.",
  "No speech was detected.": "Es wurde keine Sprache erkannt.",
  "Voice recognition is currently unavailable.": "Die Spracherkennung ist derzeit nicht verfügbar.",
  "Voice input could not be started.": "Die Spracheingabe konnte nicht gestartet werden.",
  "Voice input could not be completed.": "Die Spracheingabe konnte nicht abgeschlossen werden.",
} as const;

type TranslationKey = keyof typeof de;
type TranslationValues = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
  t: (key: string, values?: TranslationValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function resolveLocale(language?: string | null): Locale {
  return language?.toLowerCase().startsWith("de") ? "de" : "en";
}

export function isLanguagePreference(value?: string | null): value is LanguagePreference {
  return value === "system" || value === "de" || value === "en";
}

export function I18nProvider({
  children,
  initialLocale,
  initialPreference,
}: {
  children: ReactNode;
  initialLocale: Locale;
  initialPreference: LanguagePreference;
}) {
  const [preference, setPreferenceState] =
    useState<LanguagePreference>(initialPreference);
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setPreference = useCallback((next: LanguagePreference) => {
    const nextLocale =
      next === "system"
        ? resolveLocale(navigator.languages[0] ?? navigator.language)
        : next;

    setPreferenceState(next);
    setLocale(nextLocale);
    window.localStorage.setItem(LANGUAGE_COOKIE, next);
    document.cookie = `${LANGUAGE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, []);

  const t = useCallback(
    (key: string, values?: TranslationValues) => {
      let translated =
        locale === "de" ? de[key as TranslationKey] ?? key : key;

      for (const [name, value] of Object.entries(values ?? {})) {
        translated = translated.replaceAll(`{${name}}`, String(value));
      }

      return translated;
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, preference, setPreference, t }),
    [locale, preference, setPreference, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return context;
}
