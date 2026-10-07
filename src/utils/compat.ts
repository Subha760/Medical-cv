// Vite's lazy-route loader uses allSettled, missing in Android 10's stock WebView.
if (!Promise.allSettled) {
  Promise.allSettled = function (values: Iterable<unknown>) {
    return Promise.all(Array.from(values, value => Promise.resolve(value).then(
      result => ({ status: 'fulfilled' as const, value: result }),
      reason => ({ status: 'rejected' as const, reason })
    )));
  } as typeof Promise.allSettled;
}

// Older Android System WebView versions need these for workspace forms/backups.
if (!Object.fromEntries) {
  Object.fromEntries = function (entries: Iterable<readonly [PropertyKey, unknown]>) {
    const result: Record<PropertyKey, unknown> = {};
    for (const [key,value] of entries) Object.defineProperty(result,key,{value,enumerable:true,configurable:true,writable:true});
    return result;
  } as typeof Object.fromEntries;
}
if (!Blob.prototype.text) {
  Blob.prototype.text = function () {
    return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Unable to read file.'));reader.readAsText(this);});
  };
}
