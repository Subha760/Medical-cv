package com.medcvmaker.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.JavascriptInterface;
import android.util.Base64;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private WebView webView;
    private AdsController ads;
    public WebView getBrowser() { return webView; }
    private ValueCallback<Uri[]> fileCallback;
    private static final int FILE_REQUEST = 41;
    private static final int SAVE_REQUEST = 42;
    private byte[] pendingPdf;

    private boolean pulseApp() { return BuildConfig.APP_ENTRY.startsWith("pulse/"); }
    static boolean trustedPulseResource(Uri uri) {
        return "https".equals(uri.getScheme()) && java.util.Arrays.asList("medico.choicematrix.in","toolinger-owner.cloudflareaccess.com","challenges.cloudflare.com").contains(uri.getHost()) && (uri.getPort()==-1 || uri.getPort()==443);
    }
    static boolean trustedPulseNavigation(Uri uri) {
        if(!trustedPulseResource(uri))return false;
        String host=uri.getHost(),path=uri.getPath();
        return "toolinger-owner.cloudflareaccess.com".equals(host) || ("medico.choicematrix.in".equals(host) && (path.equals("/pulse") || path.startsWith("/pulse/") || path.startsWith("/cdn-cgi/access/")));
    }
    private boolean trustedBridgePage() {
        String url=webView.getUrl();if(url==null)return false;
        Uri uri=Uri.parse(url);
        return "https".equals(uri.getScheme()) && ("appassets.androidplatform.net".equals(uri.getHost()) || (pulseApp() && "medico.choicematrix.in".equals(uri.getHost()) && uri.getPath().startsWith("/pulse/")));
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        android.widget.LinearLayout root = new android.widget.LinearLayout(this);
        root.setOrientation(android.widget.LinearLayout.VERTICAL);
        root.addView(webView, new android.widget.LinearLayout.LayoutParams(-1,0,1));
        setContentView(root);
        ads = new AdsController(this,root);
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse response = loader.shouldInterceptRequest(request.getUrl());
                if (response != null) return response;
                Uri uri = request.getUrl();
                // Public app uses local assets. Pulse permits only its own HTTPS owner-verification resources.
                if ("https".equals(uri.getScheme()) && "jfweexvfnkotusyajkst.supabase.co".equals(uri.getHost())) return null;
                if ("https".equals(uri.getScheme()) && java.util.Arrays.asList("identitytoolkit.googleapis.com", "securetoken.googleapis.com", "medico-choicematrix.firebaseapp.com").contains(uri.getHost())) return null;
                if ("https".equals(uri.getScheme()) && "medico.choicematrix.in".equals(uri.getHost()) && uri.getPath().equals("/api/account")) return null;
                if(pulseApp() && trustedPulseResource(uri))return null;
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", java.util.Collections.emptyMap(), new java.io.ByteArrayInputStream(new byte[0]));
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                if(pulseApp() && request.isForMainFrame() && "medico.choicematrix.in".equals(request.getUrl().getHost()) && request.getUrl().getPath().equals("/pulse/"))
                    view.loadUrl("https://appassets.androidplatform.net/assets/web/" + BuildConfig.APP_ENTRY);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri=request.getUrl();
                if ("https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())) return false;
                if(pulseApp() && trustedPulseNavigation(uri))return false;
                if ("https".equals(uri.getScheme()) || "mailto".equals(uri.getScheme()) || "tel".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW,uri)); } catch (Exception ignored) {}
                }
                return true;
            }
        });
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface public void setAdPlacement(String path, boolean referred) { runOnUiThread(() -> { if(trustedBridgePage())ads.setPlacement(path,referred); }); }
            @JavascriptInterface public void adPrivacyChoices() { runOnUiThread(() -> { if(trustedBridgePage())ads.privacyChoices(); }); }
            @JavascriptInterface public void savePdf(String base64, String filename) { saveFile(base64,filename,"application/pdf"); }
            @JavascriptInterface public void saveFile(String base64, String filename, String mime) {
                if (base64 == null || filename == null || base64.length() > 28000000) return;
                final String safeMime = java.util.Arrays.asList("application/pdf","application/json","text/calendar","text/csv","text/plain","application/vnd.openxmlformats-officedocument.wordprocessingml.document").contains(mime) ? mime : "application/octet-stream";
                runOnUiThread(() -> {
                    if(!trustedBridgePage())return;
                    if(pendingPdf != null) { Toast.makeText(MainActivity.this,"Finish the current export first",Toast.LENGTH_SHORT).show(); return; }
                    try {
                        pendingPdf=Base64.decode(base64,Base64.DEFAULT);
                        Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                        intent.addCategory(Intent.CATEGORY_OPENABLE);
                        intent.setType(safeMime);
                        intent.putExtra(Intent.EXTRA_TITLE,filename.replaceAll("[^A-Za-z0-9._-]","_"));
                        startActivityForResult(intent,SAVE_REQUEST);
                    } catch(Exception error) { pendingPdf=null; Toast.makeText(MainActivity.this,"Could not open file picker",Toast.LENGTH_LONG).show(); }
                });
            }
        }, "MedCVAndroid");
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(android.webkit.ConsoleMessage message) {
                android.util.Log.d("MedCV", message.message() + " at " + message.sourceId() + ":" + message.lineNumber());
                return true;
            }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (!trustedBridgePage()) { callback.onReceiveValue(null); return true; }
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try { startActivityForResult(params.createIntent(), FILE_REQUEST); }
                catch (Exception error) { fileCallback.onReceiveValue(null); fileCallback = null; return true; }
                return true;
            }
        });
        webView.loadUrl(pulseApp()?"https://medico.choicematrix.in/pulse/":"https://appassets.androidplatform.net/assets/web/" + BuildConfig.APP_ENTRY);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if(requestCode == SAVE_REQUEST) {
            if(resultCode == RESULT_OK && data != null && data.getData() != null && pendingPdf != null) {
                try (OutputStream stream=getContentResolver().openOutputStream(data.getData())) {
                    if(stream == null) throw new java.io.IOException();
                    stream.write(pendingPdf);
                    Toast.makeText(this,"File saved",Toast.LENGTH_SHORT).show();
                } catch(Exception error) { Toast.makeText(this,"Unable to save file. Try another folder.",Toast.LENGTH_LONG).show(); }
            }
            pendingPdf=null;
        }
        if (requestCode == FILE_REQUEST && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
        }
    }

    @Override protected void onPause() { android.webkit.CookieManager.getInstance().flush();if(ads!=null)ads.pause();super.onPause(); }
    @Override protected void onResume() { super.onResume();if(ads!=null)ads.resume(); }
    @Override protected void onDestroy() { if(ads!=null)ads.destroy();if(webView!=null)webView.destroy();super.onDestroy(); }
    @Override public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
}
