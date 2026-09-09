declare global { interface Window { MedCVAndroid?: {savePdf(data:string,name:string):void} } }
export async function downloadPdf(blob:Blob,name:string) {
  if(window.MedCVAndroid) {
    const reader=new FileReader();
    reader.onload=()=>window.MedCVAndroid!.savePdf(String(reader.result).split(',')[1],name);
    reader.readAsDataURL(blob); return;
  }
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
