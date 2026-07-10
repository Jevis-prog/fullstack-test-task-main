import { useCallback, useEffect, useState } from "react";

import { createFile, getAlerts, getFiles } from "./api";
import type { AlertItem, FileItem } from "./types";

export function useFileData() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [filesData, alertsData] = await Promise.all([getFiles(), getAlerts()]);
      setFiles(filesData);
      setAlerts(alertsData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Произошла ошибка");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function uploadFile(title: string, file: File) {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await createFile(title, file);
      await loadData();
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Произошла ошибка");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    files,
    alerts,
    isLoading,
    isSubmitting,
    errorMessage,
    setErrorMessage,
    loadData,
    uploadFile,
  };
}
