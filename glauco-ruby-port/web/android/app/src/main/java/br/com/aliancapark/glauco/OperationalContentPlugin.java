package br.com.aliancapark.glauco;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.LinkedHashMap;
import java.util.Map;

/** Persistent operational WebViews. Remote pages receive no JavaScript interface. */
@CapacitorPlugin(name = "OperationalContent")
public class OperationalContentPlugin extends Plugin {
    private final Map<String, WebView> children = new LinkedHashMap<>();
    private final Map<String, String> urls = new LinkedHashMap<>();
    private FrameLayout overlay;
    static ValueCallback<Uri[]> fileCallback;
    static final int FILE_REQUEST = 7061;

    private float number(PluginCall call, String key) {
        try { return Float.parseFloat(call.getString(key, "0")); }
        catch (NumberFormatException e) { return 0; }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private WebView create(String id) {
        if (overlay == null) {
            overlay = new FrameLayout(getContext());
            ViewGroup parent = (ViewGroup) bridge.getWebView().getParent();
            parent.addView(overlay, new ViewGroup.LayoutParams(-1, -1));
        }
        WebView web = new WebView(getContext());
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = params.createIntent();
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
                try { getActivity().startActivityForResult(intent, FILE_REQUEST); }
                catch (Exception e) { fileCallback.onReceiveValue(null); fileCallback = null; }
                return true;
            }
        });
        overlay.addView(web, new FrameLayout.LayoutParams(1, 1));
        children.put(id, web);
        return web;
    }

    @PluginMethod public void upsert(PluginCall call) {
        String id = call.getString("id", "");
        String url = call.getString("url", "");
        Uri parsed = Uri.parse(url);
        if (id.isEmpty() || !("http".equals(parsed.getScheme()) || "https".equals(parsed.getScheme()))) {
            call.reject("Endereço de servidor inválido"); return;
        }
        getActivity().runOnUiThread(() -> {
            WebView web = children.get(id);
            if (web == null) web = create(id);
            float density = getContext().getResources().getDisplayMetrics().density;
            FrameLayout.LayoutParams layout = new FrameLayout.LayoutParams(
                Math.max(1, Math.round(number(call, "width") * density)),
                Math.max(1, Math.round(number(call, "height") * density)));
            layout.leftMargin = Math.round(number(call, "x") * density);
            layout.topMargin = Math.round(number(call, "y") * density);
            web.setLayoutParams(layout);
            web.setVisibility("1".equals(call.getString("visible")) ? View.VISIBLE : View.INVISIBLE);
            if (!url.equals(urls.get(id))) { urls.put(id, url); web.loadUrl(url); }
            call.resolve();
        });
    }

    @PluginMethod public void remove(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            String id = call.getString("id", "");
            WebView web = children.remove(id); urls.remove(id);
            if (web != null) { overlay.removeView(web); web.destroy(); }
            call.resolve();
        });
    }

    static boolean fileResult(int request, int result, Intent data) {
        if (request != FILE_REQUEST) return false;
        if (fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            fileCallback = null;
        }
        return true;
    }

    @Override protected void handleOnDestroy() {
        for (WebView web : children.values()) web.destroy();
        children.clear(); urls.clear();
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
    }
}
