declare global {
  interface Window {
    MedCVAndroid?: {
      setAdPlacement?(path: string, referred: boolean): void;
      adPrivacyChoices?(): void;
      savePdf(data: string, name: string): void;
      saveFile?(data: string, name: string, mime: string): void;
    };
  }
}
export async function downloadPdf(blob: Blob, name: string) {
  if (window.MedCVAndroid) {
    const reader = new FileReader();
    reader.onload = () =>
      window.MedCVAndroid!.savePdf(String(reader.result).split(",")[1], name);
    reader.readAsDataURL(blob);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function downloadFile(blob: Blob, name: string) {
  if (window.MedCVAndroid?.saveFile) {
    const reader = new FileReader();
    reader.onload = () =>
      window.MedCVAndroid!.saveFile!(
        String(reader.result).split(",")[1],
        name,
        blob.type || "application/octet-stream",
      );
    reader.readAsDataURL(blob);
    return;
  }
  if (window.MedCVAndroid)
    throw new Error("Update the Android app to export backups and calendars.");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
