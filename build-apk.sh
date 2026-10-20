#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Compilando nuevo APK de SpotyLuis (v1.3.0) ==="

# 1. Asegurar build limpio de dist
npm run build

# 2. Directorio temporal de trabajo
WORK="/tmp/apk-build-work"
rm -rf "$WORK"
mkdir -p "$WORK/assets"
mkdir -p "$WORK/out"
mkdir -p "$WORK/classes"
mkdir -p "$WORK/dex"

# 3. Preparar assets web desde dist (excluyendo cualquier .apk)
echo "Copiando assets web de dist..."
cp -r dist/* "$WORK/assets/"
rm -f "$WORK/assets/"*.apk 2>/dev/null || true

# 4. Asegurar SDK android.jar, ECJ, R8 y Keystore
ANDROID_JAR="$SCRIPT_DIR/android-sdk/android.jar"
ECJ_JAR="$SCRIPT_DIR/android-sdk/ecj.jar"
R8_JAR="$SCRIPT_DIR/android-sdk/r8.jar"
KEYSTORE="$SCRIPT_DIR/android-sdk/aurahifi-release.keystore"

if [ ! -f "$ANDROID_JAR" ]; then
    echo "Descargando android.jar oficial..."
    python3 -c "
import urllib.request, zipfile, io
req = urllib.request.Request('https://dl.google.com/android/repository/platform-33_r02.zip', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    data = resp.read()
with zipfile.ZipFile(io.BytesIO(data)) as z:
    for name in z.namelist():
        if name.endswith('android.jar'):
            with open('$ANDROID_JAR', 'wb') as f:
                f.write(z.read(name))
            break
"
fi

if [ ! -f "$ECJ_JAR" ]; then
    echo "Descargando compilador Java ECJ..."
    curl -sL "https://repo1.maven.org/maven2/org/eclipse/jdt/ecj/3.38.0/ecj-3.38.0.jar" -o "$ECJ_JAR"
fi

if [ ! -f "$R8_JAR" ]; then
    echo "Descargando compilador DEX Google D8/R8..."
    curl -sL "https://dl.google.com/dl/android/maven2/com/android/tools/r8/8.2.42/r8-8.2.42.jar" -o "$R8_JAR"
fi

if [ ! -f "$KEYSTORE" ]; then
    mkdir -p "$SCRIPT_DIR/android-sdk"
    keytool -genkeypair -v \
        -keystore "$KEYSTORE" \
        -alias aurahifi \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass android \
        -keypass android \
        -dname "CN=SpotyLuis, OU=Music, O=SpotyLuis, L=Madrid, ST=Madrid, C=ES"
fi

# 5. Compilar código nativo Java (MainActivity con auto-actualización OTA e interceptor inteligente de descargas)
echo "Compilando código nativo Android a DEX..."
java -jar "$ECJ_JAR" -7 -cp "$ANDROID_JAR" -d "$WORK/classes" \
    "$SCRIPT_DIR/android/src/com/aurahifi/music/MainActivity.java"

java -cp "$R8_JAR" com.android.tools.r8.D8 \
    --lib "$ANDROID_JAR" \
    --output "$WORK/dex" \
    "$WORK/classes/com/aurahifi/music/"*.class

cp "$WORK/dex/classes.dex" "$SCRIPT_DIR/android/classes.dex"

build_single_apk() {
    local PKG_NAME="$1"
    local APK_NAME="$2"
    local LABEL="$3"

    echo "--- Construyendo $APK_NAME ($PKG_NAME) ---"
    local BASE_APK="$WORK/out/${APK_NAME}-base.apk"
    local ALIGNED_APK="$WORK/out/${APK_NAME}-aligned.apk"
    local SIGNED_APK="$WORK/out/${APK_NAME}.apk"

    rm -f "$BASE_APK" "$ALIGNED_APK" "$SIGNED_APK"

    # Empaquetar con aapt (garantiza resources.arsc NO comprimido)
    aapt package -v -f \
        -M "$SCRIPT_DIR/android/AndroidManifest.xml" \
        -S "$SCRIPT_DIR/android/res" \
        -A "$WORK/assets" \
        -I "$ANDROID_JAR" \
        --version-code 4 \
        --version-name "1.3.0" \
        --replace-version \
        -F "$BASE_APK"

    # Inyectar classes.dex recién compilado
    cd "$WORK/dex"
    zip -u "$BASE_APK" classes.dex
    cd "$SCRIPT_DIR"

    # Alinear con zipalign a 4 bytes
    zipalign -f -p 4 "$BASE_APK" "$ALIGNED_APK"

    # Firmar con apksigner (esquemas v1, v2 y v3)
    apksigner sign \
        --ks "$KEYSTORE" \
        --ks-key-alias aurahifi \
        --ks-pass pass:android \
        --key-pass pass:android \
        --out "$SIGNED_APK" \
        "$ALIGNED_APK"

    # Verificar integridad y alineación
    apksigner verify --verbose "$SIGNED_APK"
    zipalign -c -v 4 "$SIGNED_APK" | grep "resources.arsc"

    # Desplegar únicamente a public y dist como aurahifi.apk
    mkdir -p public dist
    cp "$SIGNED_APK" "public/aurahifi.apk"
    cp "$SIGNED_APK" "dist/aurahifi.apk"
    cp "$SIGNED_APK" "public/AuraHiFi.apk"
    cp "$SIGNED_APK" "dist/AuraHiFi.apk"

    # Eliminar cualquier APK Clean residual anterior
    rm -f public/AuraHiFi-Clean.apk dist/AuraHiFi-Clean.apk

    echo "-> aurahifi.apk generado con éxito ($(ls -lh public/aurahifi.apk | awk '{print $5}'))"
}

# Construir ÚNICO APK Oficial de SpotyLuis (aurahifi.apk v1.3.0)
build_single_apk "com.aurahifi.music" "aurahifi" "SpotyLuis (Oficial v1.3.0)"

echo "=== ¡APK DE SPOTYLUIS (aurahifi.apk) GENERADO Y VERIFICADO CORRECTAMENTE! ==="
ls -lh public/AuraHiFi.apk
