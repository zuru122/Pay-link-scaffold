"use client";

import { useEffect, useState } from "react";

export type ToastType = "info" | "success" | "error";

export type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

const MAX_TOASTS = 3;
const TOAST_DURATION_MS = 4000;

let nextToastId = 1;
let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function dismissToast(id: number) {
  toasts = toasts.filter((toastItem) => toastItem.id !== id);
  emit();
}

export function toast(message: string, type: ToastType = "info") {
  const id = nextToastId;
  nextToastId += 1;

  toasts = [...toasts, { id, message, type }].slice(-MAX_TOASTS);
  emit();

  if (typeof window !== "undefined") {
    window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
  }
}

export function useToast() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    function listener() {
      setVersion((version) => version + 1);
    }

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    dismissToast,
    toast,
    toasts,
  };
}
