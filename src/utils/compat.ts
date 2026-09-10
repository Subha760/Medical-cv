// Vite's lazy-route loader uses allSettled, missing in Android 10's stock WebView.
if (!Promise.allSettled) {
  Promise.allSettled = function (values: Iterable<unknown>) {
    return Promise.all(Array.from(values, value => Promise.resolve(value).then(
      result => ({ status: 'fulfilled' as const, value: result }),
      reason => ({ status: 'rejected' as const, reason })
    )));
  } as typeof Promise.allSettled;
}
