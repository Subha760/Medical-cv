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
    private ValueCallback<Uri[]> fileCallback;
    private static final int FILE_REQUEST = 41;
    private static final int SAVE_REQUEST = 42;
    private byte[] pendingPdf;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        setContentView(webView);
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
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", java.util.Collections.emptyMap(), new java.io.ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri=request.getUrl();
                if ("https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())) return false;
                if ("https".equals(uri.getScheme()) || "mailto".equals(uri.getScheme()) || "tel".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW,uri)); } catch (Exception ignored) {}
                }
                return true;
            }
        });
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface public void savePdf(String base64, String filename) {
                if (base64 == null || base64.length() > 28000000) return;
                runOnUiThread(() -> {
                    if(pendingPdf != null) return;
                    try {
                        pendingPdf=Base64.decode(base64,Base64.DEFAULT);
                        Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                        intent.addCategory(Intent.CATEGORY_OPENABLE);
                        intent.setType("application/pdf");
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
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try { startActivityForResult(params.createIntent(), FILE_REQUEST); }
                catch (Exception error) { fileCallback.onReceiveValue(null); fileCallback = null; return true; }
                return true;
            }
        });
        webView.loadUrl("https://appassets.androidplatform.net/assets/web/index.html");
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if(requestCode == SAVE_REQUEST) {
            if(resultCode == RESULT_OK && data != null && data.getData() != null && pendingPdf != null) {
                try (OutputStream stream=getContentResolver().openOutputStream(data.getData())) {
                    if(stream == null) throw new java.io.IOException();
                    stream.write(pendingPdf);
                    Toast.makeText(this,"PDF saved",Toast.LENGTH_SHORT).show();
                } catch(Exception error) { Toast.makeText(this,"Unable to save PDF. Try another folder.",Toast.LENGTH_LONG).show(); }
            }
            pendingPdf=null;
        }
        if (requestCode == FILE_REQUEST && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
        }
    }

    @Override public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
}
