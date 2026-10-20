package com.aurahifi.music;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.KeyEvent;
import android.webkit.ConsoleMessage;
import android.webkit.DownloadListener;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.InputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.media.AudioManager;
import android.os.Build;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> fileUploadCallback;
    private final static int FILE_CHOOSER_REQUEST = 1001;
    private android.os.PowerManager.WakeLock wakeLock;
    private static final String CHANNEL_ID = "spotyluis_playback_channel";
    private static final int NOTIFICATION_ID = 4040;
    private NotificationManager notificationManager;
    private AudioManager audioManager;
    private AudioManager.OnAudioFocusChangeListener audioFocusListener;

    public static final String CLOUD_URL = "https://ais-dev-jzugozisvqqdczqo2euymb-957426344434.europe-west2.run.app";
    public static final String LOCAL_URL = "https://localhost/index.html";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#09090b"));
        setContentView(webView);

        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && notificationManager != null) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "SpotyLuis Reproducción",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Audio y controles en segundo plano");
            channel.setShowBadge(false);
            notificationManager.createNotificationChannel(channel);
        }

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setDefaultTextEncodingName("UTF-8");
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // SpotyLuisNative: Background audio WakeLock & lock screen notification control
        webView.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public void setPlayingState(final boolean playing) {
                setPlaybackState(playing, "SpotyLuis", "Música Hi-Fi");
            }

            @android.webkit.JavascriptInterface
            public void setPlayingState(final boolean playing, final String title, final String artist) {
                setPlaybackState(playing, title, artist);
            }
        }, "SpotyLuisNative");

        // Enable Cookies
        android.webkit.CookieManager cookieManager = android.webkit.CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // Native Download Listener: Forward APK and media downloads to Android System Downloader
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                try {
                    String targetUrl = url;
                    if (targetUrl.startsWith("https://localhost/") || targetUrl.startsWith("http://localhost/")) {
                        targetUrl = targetUrl.replace("https://localhost", CLOUD_URL).replace("http://localhost", CLOUD_URL);
                    }
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl));
                    startActivity(intent);
                } catch (Exception e) {
                    Log.e("AuraHiFi", "Error opening download: " + e.getMessage());
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return handleIntercept(request.getUrl());
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return handleIntercept(Uri.parse(url));
            }

            private WebResourceResponse handleIntercept(Uri uri) {
                if (uri == null) return null;
                String host = uri.getHost();
                if ("localhost".equals(host) || "appassets.androidplatform.net".equals(host)) {
                    String path = uri.getPath();
                    if (path != null && path.startsWith("/api/")) {
                        // Allow API requests to route to live cloud server without asset interception
                        return null;
                    }
                    if (path == null || path.isEmpty() || "/".equals(path)) {
                        path = "index.html";
                    }
                    if (path.startsWith("/")) {
                        path = path.substring(1);
                    }
                    InputStream is = null;
                    try {
                        is = getAssets().open(path);
                    } catch (IOException e1) {
                        try {
                            is = getAssets().open("assets/" + path);
                        } catch (IOException e2) {
                            if (path.startsWith("assets/")) {
                                try {
                                    is = getAssets().open(path.substring(7));
                                } catch (IOException e3) {
                                    Log.d("AuraHiFi", "Asset not found: " + path);
                                }
                            }
                        }
                    }
                    if (is != null) {
                        String mime = "text/html";
                        if (path.endsWith(".js")) mime = "application/javascript";
                        else if (path.endsWith(".css")) mime = "text/css";
                        else if (path.endsWith(".svg")) mime = "image/svg+xml";
                        else if (path.endsWith(".json") || path.endsWith(".webmanifest")) mime = "application/json";
                        else if (path.endsWith(".png")) mime = "image/png";
                        else if (path.endsWith(".wav")) mime = "audio/wav";
                        else if (path.endsWith(".flac")) mime = "audio/flac";
                        else if (path.endsWith(".mp3")) mime = "audio/mpeg";

                        Map<String, String> headers = new HashMap<String, String>();
                        headers.put("Access-Control-Allow-Origin", "*");
                        headers.put("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                        return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, is);
                    }
                }
                return null;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null) return false;

                // If user clicks an APK download link, open in Android system installer/browser
                if (url.endsWith(".apk") || url.contains("aurahifi") || url.contains("AuraHiFi") || url.contains("download-apk")) {
                    try {
                        String target = url;
                        if (target.contains("localhost")) {
                            target = target.replace("https://localhost", CLOUD_URL).replace("http://localhost", CLOUD_URL);
                        }
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(target));
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        Log.e("SpotyLuis", "Error opening APK link: " + e.getMessage());
                    }
                }

                // Keep app navigation inside the WebView (both cloud, local, and YouTube media streaming)
                if (url.contains("localhost") || 
                    url.contains("appassets.androidplatform.net") || 
                    url.contains("youtube.com") || 
                    url.contains("youtube-nocookie.com") || 
                    url.contains("googlevideo.com") || 
                    url.contains("ytimg.com") || 
                    url.startsWith("blob:") || 
                    url.startsWith("data:")) {
                    return false;
                }

                // External links open in browser
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                } catch (Exception e) {
                    e.printStackTrace();
                }
                return true;
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                Log.w("AuraHiFi", "WebView error: " + description + " for " + failingUrl);
                if (failingUrl != null && !failingUrl.equals(LOCAL_URL)) {
                    view.loadUrl(LOCAL_URL);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d("AuraHiFi-JS", consoleMessage.message() + " -- Line: " + consoleMessage.lineNumber());
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.setType("audio/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(Intent.createChooser(intent, "Selecciona tu música local"), FILE_CHOOSER_REQUEST);
                return true;
            }
        });

        // Always load high-speed local assets first for zero-latency, 100% offline playback
        Log.i("AuraHiFi", "Starting Aura Hi-Fi player from local assets: " + LOCAL_URL);
        webView.loadUrl(LOCAL_URL);
    }

    private boolean isNetworkAvailable() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null) {
                NetworkInfo netInfo = cm.getActiveNetworkInfo();
                return netInfo != null && netInfo.isConnected();
            }
        } catch (Exception e) {
            Log.w("AuraHiFi", "Connectivity check exception: " + e.getMessage());
        }
        return false;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (fileUploadCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    if (data.getClipData() != null) {
                        int count = data.getClipData().getItemCount();
                        results = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    } else if (data.getData() != null) {
                        results = new Uri[]{ data.getData() };
                    }
                }
                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            }
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    private void setPlaybackState(final boolean playing, final String title, final String artist) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (playing) {
                        // 1. Maintain CPU awake when screen is locked
                        if (wakeLock == null) {
                            android.os.PowerManager pm = (android.os.PowerManager) getSystemService(Context.POWER_SERVICE);
                            if (pm != null) {
                                wakeLock = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "SpotyLuis::MusicPlaybackLock");
                            }
                        }
                        if (wakeLock != null && !wakeLock.isHeld()) {
                            wakeLock.acquire(4 * 60 * 60 * 1000L); // 4 hours max
                            Log.i("SpotyLuis", "Background audio WakeLock acquired");
                        }

                        // 2. Request system audio focus
                        if (audioManager != null) {
                            if (audioFocusListener == null) {
                                audioFocusListener = new AudioManager.OnAudioFocusChangeListener() {
                                    @Override
                                    public void onAudioFocusChange(int focusChange) {}
                                };
                            }
                            audioManager.requestAudioFocus(audioFocusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
                        }

                        // 3. Post lock screen notification with track metadata
                        if (notificationManager != null) {
                            Intent openIntent = new Intent(MainActivity.this, MainActivity.class);
                            openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                            if (Build.VERSION.SDK_INT >= 23) {
                                flags |= PendingIntent.FLAG_IMMUTABLE;
                            }
                            PendingIntent pendingIntent = PendingIntent.getActivity(MainActivity.this, 0, openIntent, flags);

                            Notification.Builder builder;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                builder = new Notification.Builder(MainActivity.this, CHANNEL_ID);
                            } else {
                                builder = new Notification.Builder(MainActivity.this);
                            }

                            builder.setContentTitle(title != null && !title.isEmpty() ? title : "SpotyLuis")
                                   .setContentText(artist != null && !artist.isEmpty() ? artist : "Reproduciendo en segundo plano")
                                   .setSmallIcon(android.R.drawable.ic_media_play)
                                   .setContentIntent(pendingIntent)
                                   .setOngoing(true);

                            notificationManager.notify(NOTIFICATION_ID, builder.build());
                        }
                    } else {
                        if (wakeLock != null && wakeLock.isHeld()) {
                            wakeLock.release();
                            Log.i("SpotyLuis", "Background audio WakeLock released");
                        }
                        if (notificationManager != null) {
                            notificationManager.cancel(NOTIFICATION_ID);
                        }
                    }
                } catch (Exception e) {
                    Log.w("SpotyLuis", "Playback state error: " + e.getMessage());
                }
            }
        });
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Crucial: Do NOT call webView.onPause() so background music and timers continue playing uninterrupted!
    }

    @Override
    protected void onStop() {
        super.onStop();
        // Keep background audio active when screen is locked or app is minimized
    }

    @Override
    protected void onDestroy() {
        if (notificationManager != null) {
            notificationManager.cancel(NOTIFICATION_ID);
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception e) {}
        }
        super.onDestroy();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
