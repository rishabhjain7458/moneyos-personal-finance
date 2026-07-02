package com.moneyos.app;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final int SMS_PERMISSION_REQUEST = 42;
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        webView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.addJavascriptInterface(new MoneyOsBridge(), "MoneyOsAndroid");
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        setContentView(webView);

        if (savedInstanceState == null) {
            webView.loadUrl(getString(R.string.moneyos_url));
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    public class MoneyOsBridge {
        @JavascriptInterface
        public void requestSmsInbox() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                        && checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.READ_SMS}, SMS_PERMISSION_REQUEST);
                    return;
                }
                sendSmsInboxToWeb();
            });
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == SMS_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                sendSmsInboxToWeb();
            } else {
                dispatchSmsError("SMS permission denied");
            }
        }
    }

    private void sendSmsInboxToWeb() {
        JSONArray messages = new JSONArray();
        Cursor cursor = null;
        try {
            cursor = getContentResolver().query(
                    Uri.parse("content://sms/inbox"),
                    new String[]{"address", "body", "date"},
                    null,
                    null,
                    "date DESC"
            );

            if (cursor != null) {
                int addressIndex = cursor.getColumnIndex("address");
                int bodyIndex = cursor.getColumnIndex("body");
                int dateIndex = cursor.getColumnIndex("date");
                int count = 0;
                while (cursor.moveToNext() && count < 100) {
                    JSONObject message = new JSONObject();
                    message.put("address", cursor.getString(addressIndex));
                    message.put("body", cursor.getString(bodyIndex));
                    message.put("date", cursor.getLong(dateIndex));
                    messages.put(message);
                    count++;
                }
            }

            String script = "window.dispatchEvent(new CustomEvent('moneyos:smsMessages',{detail:"
                    + messages.toString()
                    + "}));";
            webView.evaluateJavascript(script, null);
        } catch (Exception error) {
            dispatchSmsError("Unable to read SMS inbox");
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
    }

    private void dispatchSmsError(String message) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("message", message);
            String script = "window.dispatchEvent(new CustomEvent('moneyos:smsError',{detail:"
                    + payload.toString()
                    + "}));";
            webView.evaluateJavascript(script, null);
        } catch (Exception ignored) {
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
