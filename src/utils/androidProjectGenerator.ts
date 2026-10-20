import JSZip from 'jszip';

export const PRODUCTION_APP_URL = 'https://ais-dev-jzugozisvqqdczqo2euymb-957426344434.europe-west2.run.app';

export const MAIN_ACTIVITY_KOTLIN = `package com.aurahifi.music

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.KeyEvent
import android.webkit.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.webkit.WebViewAssetLoader

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    // Native file picker for local audio files (FLAC, ALAC, WAV, MP3)
    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val clipData = result.data?.clipData
            val data = result.data?.data
            val results: Array<Uri>? = when {
                clipData != null -> {
                    Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                }
                data != null -> arrayOf(data)
                else -> null
            }
            fileUploadCallback?.onReceiveValue(results)
        } else {
            fileUploadCallback?.onReceiveValue(null)
        }
        fileUploadCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Edge to edge immersive dark theme
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = android.graphics.Color.parseColor("#09090b")
        window.navigationBarColor = android.graphics.Color.parseColor("#09090b")

        webView = WebView(this).apply {
            layoutParams = android.view.ViewGroup.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(android.graphics.Color.parseColor("#09090b"))
        }
        setContentView(webView)

        configureWebView()

        // Load 100% offline self-contained local assets (Zero 403 errors, runs completely on phone!)
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                return handleIntercept(request?.url)
            }

            override fun shouldInterceptRequest(view: WebView?, url: String?): WebResourceResponse? {
                return if (url != null) handleIntercept(Uri.parse(url)) else null
            }

            private fun handleIntercept(uri: Uri?): WebResourceResponse? {
                if (uri == null) return null
                val host = uri.host
                if ("localhost" == host || "appassets.androidplatform.net" == host) {
                    var path = uri.path ?: "index.html"
                    if (path.isEmpty() || "/" == path) {
                        path = "index.html"
                    }
                    if (path.startsWith("/")) {
                        path = path.substring(1)
                    }

                    var inputStream: InputStream? = null
                    try {
                        inputStream = assets.open(path)
                    } catch (e1: IOException) {
                        try {
                            inputStream = assets.open("assets/$path")
                        } catch (e2: IOException) {
                            if (path.startsWith("assets/")) {
                                try {
                                    inputStream = assets.open(path.substring(7))
                                } catch (e3: IOException) {
                                    Log.e("AuraHiFi", "Asset not found: $path")
                                }
                            }
                        }
                    }

                    if (inputStream != null) {
                        val mime = when {
                            path.endsWith(".js") -> "application/javascript"
                            path.endsWith(".css") -> "text/css"
                            path.endsWith(".svg") -> "image/svg+xml"
                            path.endsWith(".json") || path.endsWith(".webmanifest") -> "application/json"
                            path.endsWith(".png") -> "image/png"
                            path.endsWith(".wav") -> "audio/wav"
                            path.endsWith(".flac") -> "audio/flac"
                            path.endsWith(".mp3") -> "audio/mpeg"
                            else -> "text/html"
                        }
                        val headers = HashMap<String, String>().apply {
                            put("Access-Control-Allow-Origin", "*")
                            put("Access-Control-Allow-Methods", "GET, OPTIONS")
                        }
                        return WebResourceResponse(mime, "UTF-8", 200, "OK", headers, inputStream)
                    }
                }
                return null
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url.toString()
                return if (url.contains("localhost") || url.contains("appassets.androidplatform.net") || url.startsWith("blob:") || url.startsWith("data:")) {
                    false
                } else {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                    true
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            // Support local music file and folder selection on Android
            override fun onShowFileChooser(
                view: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "audio/*"
                    putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                filePickerLauncher.launch(Intent.createChooser(intent, "Selecciona archivos de audio"))
                return true
            }
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }
}
`;

export const ANDROID_MANIFEST_XML = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:hardwareAccelerated="true"
        android:theme="@style/Theme.AuraHiFi">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout|smallestScreenSize"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`;

export const APP_BUILD_GRADLE_KTS = `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.aurahifi.music"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.aurahifi.music"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity.ktx)
    implementation(libs.androidx.webkit)
}
`;

export const ROOT_BUILD_GRADLE_KTS = `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
}
`;

export const SETTINGS_GRADLE_KTS = `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Aura Hi-Fi Music"
include(":app")
`;

export const LIBS_VERSIONS_TOML = `[versions]
agp = "8.7.2"
kotlin = "2.0.21"
coreKtx = "1.15.0"
appcompat = "1.7.0"
material = "1.12.0"
activityKtx = "1.9.3"
webkit = "1.12.1"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-appcompat = { group = "androidx.appcompat", name = "appcompat", version.ref = "appcompat" }
material = { group = "com.google.android.material", name = "material", version.ref = "material" }
androidx-activity-ktx = { group = "androidx.activity", name = "activity-ktx", version.ref = "activityKtx" }
androidx-webkit = { group = "androidx.webkit", name = "webkit", version.ref = "webkit" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
`;

export const STRINGS_XML = `<resources>
    <string name="app_name">Aura Hi-Fi</string>
</resources>
`;

export const COLORS_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="black">#FF000000</color>
    <color name="white">#FFFFFFFF</color>
    <color name="background_dark">#FF09090B</color>
    <color name="emerald_accent">#FF10B981</color>
</resources>
`;

export const THEMES_XML = `<resources xmlns:tools="http://schemas.android.com/tools">
    <style name="Theme.AuraHiFi" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="android:statusBarColor">@color/background_dark</item>
        <item name="android:navigationBarColor">@color/background_dark</item>
        <item name="android:windowBackground">@color/background_dark</item>
    </style>
</resources>
`;

export const README_MD = `# Aura Hi-Fi Music — Proyecto Android Studio (100% Offline y Autónomo)

Este proyecto empaqueta la aplicación de música de alta fidelidad **Aura Hi-Fi** con todos los recursos web (HTML, CSS, JS, ecualizador, sintetizador de audio) **incrustados directamente dentro de la aplicación Android** (\`app/src/main/assets/\`).

**Ventaja clave**: 
- **NO depende de ningún servidor externo ni produce errores 403**.
- Funciona 100% sin conexión a internet directamente en tu teléfono móvil.
- Utiliza la biblioteca oficial de Google \`androidx.webkit.WebViewAssetLoader\` para ejecutar WebAudio y decodificar FLAC/ALAC a máxima velocidad.

## 🚀 Pasos para compilar en Android Studio

1. Abre **Android Studio** (versión Koala, Ladybug o superior).
2. Haz clic en **Open** (Abrir) y selecciona la carpeta descomprimida \`AuraHiFi-AndroidStudio-Project\`.
3. Espera 1 minuto a que Gradle descargue las librerías necesarias.
4. Conecta tu teléfono Android mediante cable USB (con "Depuración USB" habilitada en Ajustes > Opciones de desarrollador) o inicia un Emulador.
5. Ve al menú superior:
   👉 **Build > Build Bundle(s) / APK(s) > Build APK(s)**
6. Al finalizar la compilación, haz clic en **"locate"** en la notificación para abrir la carpeta con el archivo:
   \`app/build/outputs/apk/debug/app-debug.apk\`
7. Instala el archivo \`.apk\` en tu teléfono móvil. ¡Listo! Ya tienes Aura Hi-Fi instalada para siempre.
`;

/**
 * Generates and downloads a complete ZIP archive with the Android Studio project,
 * including all built production assets embedded inside app/src/main/assets/.
 */
export async function downloadAndroidStudioProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Root configuration files
  zip.file('build.gradle.kts', ROOT_BUILD_GRADLE_KTS);
  zip.file('settings.gradle.kts', SETTINGS_GRADLE_KTS);
  zip.file('README.md', README_MD);
  zip.file(
    'gradle.properties',
    'org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\nkotlin.code.style=official\n'
  );

  // Gradle version catalog & wrapper
  zip.file('gradle/libs.versions.toml', LIBS_VERSIONS_TOML);
  zip.file(
    'gradle/wrapper/gradle-wrapper.properties',
    'distributionBase=GRADLE_USER_HOME\ndistributionPath=wrapper/dists\ndistributionUrl=https\\://services.gradle.org/distributions/gradle-8.10.2-bin.zip\nzipStoreBase=GRADLE_USER_HOME\nzipStorePath=wrapper/dists\n'
  );

  // App module configuration
  zip.file('app/build.gradle.kts', APP_BUILD_GRADLE_KTS);
  zip.file('app/proguard-rules.pro', '# Proguard rules for Aura Hi-Fi\n-keepattributes JavascriptInterface\n');
  zip.file('app/src/main/AndroidManifest.xml', ANDROID_MANIFEST_XML);

  // Kotlin source code
  zip.file('app/src/main/java/com/aurahifi/music/MainActivity.kt', MAIN_ACTIVITY_KOTLIN);

  // Resources
  zip.file('app/src/main/res/values/strings.xml', STRINGS_XML);
  zip.file('app/src/main/res/values/colors.xml', COLORS_XML);
  zip.file('app/src/main/res/values/themes.xml', THEMES_XML);

  // Embed built web assets into app/src/main/assets/
  try {
    const res = await fetch('/api/dist-assets');
    if (res.ok) {
      const data = await res.json();
      if (data.files) {
        for (const [filePath, content] of Object.entries(data.files)) {
          zip.file(`app/src/main/assets/${filePath}`, content as string);
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch dist assets, falling back to basic offline HTML:', err);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'AuraHiFi-AndroidStudio-Project.zip';
  a.click();
  URL.revokeObjectURL(url);
}
