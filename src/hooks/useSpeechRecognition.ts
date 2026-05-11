import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface Options {
  lang?: string;
  onFinal?: (text: string) => void;
}

export function useSpeechRecognition({ lang = "pt-BR", onFinal }: Options = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");

  useEffect(() => {
    setSupported(!!getCtor());
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setError(null);
    setInterim("");
    finalRef.current = "";
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let interimText = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) finalRef.current += finalText;
      setInterim(interimText);
    };
    rec.onerror = (e: any) => {
      setError(e?.error ?? "erro");
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      const text = (finalRef.current + " " + interim).trim();
      if (text && onFinal) onFinal(text);
    };
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch (err: any) {
      setError(err?.message ?? "falha ao iniciar");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, onFinal]);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* noop */ }
  }, []);

  useEffect(() => () => { try { recRef.current?.abort(); } catch { /* noop */ } }, []);

  return { supported, listening, interim, error, start, stop };
}
