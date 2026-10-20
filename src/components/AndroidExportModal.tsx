import React, { useState, useEffect } from 'react';
import { 
  downloadAndroidStudioProjectZip, 
  PRODUCTION_APP_URL,
  MAIN_ACTIVITY_KOTLIN,
  ANDROID_MANIFEST_XML,
  APP_BUILD_GRADLE_KTS
} from '../utils/androidProjectGenerator';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { 
  Smartphone, 
  Download, 
  X, 
  Copy, 
  Check, 
  Code2, 
  FileCode, 
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  FolderArchive,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  Loader2,
  QrCode,
  AlertTriangle,
  Info,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';

interface AndroidExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidExportModal: React.FC<AndroidExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'apk' | 'studio' | 'pwa'>('apk');
  const [copied, setCopied] = useState(false);
  const [copiedApkUrl, setCopiedApkUrl] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [selectedFileCode, setSelectedFileCode] = useState<'main' | 'manifest' | 'gradle'>('main');
  const [apkDownloadStatus, setApkDownloadStatus] = useState<Record<string, 'idle' | 'downloading' | 'success' | 'error'>>({});
  const [showQr, setShowQr] = useState(false);

  const { isInstallable, install } = usePWAInstall();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ALWAYS compute full direct APK download URLs pointing to the live cloud server
  const baseUrl = (typeof window !== 'undefined' && 
    window.location.hostname !== 'localhost' && 
    window.location.hostname !== '127.0.0.1' && 
    !window.location.hostname.includes('androidplatform.net') &&
    window.location.protocol !== 'file:')
    ? window.location.origin
    : PRODUCTION_APP_URL;

  const directApkUrl = `${baseUrl}/aurahifi.apk`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(PRODUCTION_APP_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyApkUrl = () => {
    navigator.clipboard.writeText(directApkUrl);
    setCopiedApkUrl(true);
    setTimeout(() => setCopiedApkUrl(false), 2500);
  };

  // Robust single APK download pointing to real aurahifi.apk
  const handleApkDownload = async (filename: string = 'aurahifi.apk') => {
    setApkDownloadStatus(prev => ({ ...prev, [filename]: 'downloading' }));
    const downloadTargetUrl = `${baseUrl}/${filename}`;

    const isInsideApp = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('androidplatform.net') ||
      window.location.protocol === 'file:'
    );

    // If running inside Android WebView, opening the full HTTPS cloud URL triggers
    // Intent.ACTION_VIEW in MainActivity which opens Chrome / native Android download manager
    if (isInsideApp) {
      window.open(downloadTargetUrl, '_blank');
      setApkDownloadStatus(prev => ({ ...prev, [filename]: 'success' }));
      return;
    }

    try {
      // In browser / desktop: fetch as Blob
      const res = await fetch(downloadTargetUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 5000);

      setApkDownloadStatus(prev => ({ ...prev, [filename]: 'success' }));
    } catch (err) {
      console.warn('Fallback to direct window open:', err);
      window.open(downloadTargetUrl, '_blank');
      setApkDownloadStatus(prev => ({ ...prev, [filename]: 'success' }));
    }
  };

  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      await downloadAndroidStudioProjectZip();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (e) {
      console.error('Error generating zip:', e);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header with prominent X button */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Instalador APK para Teléfono Android
              </h2>
              <p className="text-[11px] text-zinc-400">
                Archivo instalador nativo (.apk) autónomo para tu smartphone
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (horizontal scroll on mobile) */}
        <div className="flex items-center px-4 sm:px-6 pt-3 border-b border-zinc-900 gap-4 sm:gap-6 text-xs font-semibold overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('apk')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'apk'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Descargar APK Directo</span>
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'studio'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Proyecto Android Studio (.ZIP)</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'pwa'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>PWA Web / Info 403</span>
          </button>
        </div>

        {/* Content with responsive scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {activeTab === 'apk' && (
            <div className="space-y-4">
              {/* SpotyLuis Update Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/70 via-zinc-900 to-zinc-900 border border-emerald-500/50 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>SpotyLuis v1.3.0 para Android</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                    versionCode 4
                  </span>
                </div>
                <p className="leading-relaxed text-zinc-300 text-xs">
                  Nueva versión oficial de <strong>SpotyLuis</strong> con descarga de audio auténtico (sin temas por defecto ni errores), codificación universal <strong>UTF-8</strong> y soporte para listas de canciones y ecualizador de 10 bandas. <strong>Se instala directamente sobre tu versión anterior</strong> sin perder ninguna canción ni ajuste.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-zinc-400">
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Firma de seguridad oficial
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Instalación única y directa
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Sin pérdida de datos
                  </span>
                </div>
              </div>

              {/* SINGLE UNIFIED CARD: OFFICIAL SPOTYLUIS APK */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-950/70 via-zinc-900 to-zinc-900 border-2 border-emerald-500/60 shadow-xl space-y-4 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] bg-emerald-500 text-zinc-950 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow">
                    APK Único Oficial
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 pr-12">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-extrabold text-white">
                        aurahifi.apk
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
                        SpotyLuis v1.3.0 · Oficial
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      El instalador oficial de SpotyLuis para tu móvil Android. Con un solo clic se descargará e instalará directamente como actualización de la app.
                    </p>
                  </div>

                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                </div>

                {/* Primary Download Button */}
                <div className="space-y-2 pt-1">
                  <a
                    href={directApkUrl}
                    download="aurahifi.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      const isInsideApp = typeof window !== 'undefined' && (
                        window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.includes('androidplatform.net')
                      );
                      if (isInsideApp) {
                        e.preventDefault();
                        window.open(directApkUrl, '_blank');
                      } else {
                        handleApkDownload('aurahifi.apk');
                      }
                    }}
                    className="w-full py-4 bg-emerald-400 hover:bg-emerald-300 active:scale-[0.99] text-zinc-950 font-extrabold text-sm rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2.5 cursor-pointer text-center select-none"
                  >
                    {apkDownloadStatus['aurahifi.apk'] === 'downloading' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Descargando SpotyLuis APK...</span>
                      </>
                    ) : apkDownloadStatus['aurahifi.apk'] === 'success' ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-zinc-950" />
                        <span>¡Descarga iniciada! Pulsa si necesitas repetir</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5 stroke-[2.5]" />
                        <span>Descargar SpotyLuis APK (aurahifi.apk)</span>
                      </>
                    )}
                  </a>

                  {apkDownloadStatus['aurahifi.apk'] === 'success' && (
                    <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                      <div>
                        <strong>¡Descarga en marcha!</strong> Abre el archivo descargado desde la barra de notificaciones o tu carpeta <strong>Descargas</strong> para actualizar directamente a SpotyLuis v1.3.0.
                      </div>
                    </div>
                  )}
                </div>

                {/* Secondary actions: Copy link & Web */}
                <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80">
                  <button
                    onClick={handleCopyApkUrl}
                    className="flex-1 py-2 px-3 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-zinc-700/60"
                  >
                    {copiedApkUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>¡Enlace copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Copiar enlace de descarga directa</span>
                      </>
                    )}
                  </button>

                  <a
                    href={directApkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-zinc-700/60"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Abrir en navegador</span>
                  </a>
                </div>
              </div>

              {/* QR Code toggle for direct phone download */}
              <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl">
                <button
                  onClick={() => setShowQr(!showQr)}
                  className="w-full text-xs text-zinc-400 hover:text-emerald-400 transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>¿Descargar desde el ordenador hacia tu móvil? Pulsa para ver Código QR</span>
                  </span>
                  <span className="text-[11px] text-zinc-500">{showQr ? 'Ocultar' : 'Mostrar'}</span>
                </button>

                {showQr && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/80 flex flex-col items-center gap-3 animate-fadeIn">
                    <div className="bg-white p-2.5 rounded-xl shadow-md">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(directApkUrl)}`}
                        alt="QR APK SpotyLuis"
                        className="w-36 h-36"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-400 text-center max-w-xs">
                      Apunta con la cámara de tu teléfono Android para descargar el APK de SpotyLuis directamente.
                    </p>
                  </div>
                )}
              </div>

              {/* Step-by-step Installation Guide with Play Protect & Android Tips */}
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-900 space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Pasos para una instalación correcta en Android</span>
                </div>

                <ol className="text-xs text-zinc-300 space-y-2.5 list-decimal list-inside leading-relaxed">
                  <li>
                    Pulsa en <strong>"Descargar SpotyLuis APK (v1.3.0)"</strong>.
                  </li>
                  <li>
                    Abre la aplicación <strong>Archivos / Descargas</strong> en tu teléfono y pulsa sobre <code className="text-emerald-400 font-mono">aurahifi.apk</code>.
                  </li>
                  <li>
                    <strong>Si Google Play Protect muestra aviso:</strong> Pulsa en <span className="text-emerald-400 font-semibold">"Más detalles"</span> y luego en <span className="text-emerald-400 font-semibold">"Instalar de todas formas"</span>.
                  </li>
                  <li>
                    <strong>Si pide permisos de origen desconocido:</strong> Pulsa en <em>"Ajustes"</em> y activa la casilla <em>"Permitir desde esta fuente"</em>.
                  </li>
                  <li>
                    Pulsa en <strong>"Instalar"</strong> (o "Actualizar") y listo: tendrás SpotyLuis instalado sin perder tus listas ni canciones.
                  </li>
                </ol>
              </div>

              {/* Features summary */}
              <div className="p-3 bg-zinc-900/30 rounded-xl border border-zinc-900 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  Características del APK nativo:
                </span>
                <span className="text-zinc-300">
                  Android 5.0 a Android 15 · Sin consumo de datos · Reproductor local offline · Sin error 403
                </span>
              </div>
            </div>
          )}

          {activeTab === 'studio' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/50 border border-zinc-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">
                    Código Fuente Completo para Android Studio (.ZIP)
                  </div>
                  <p className="text-xs text-zinc-400 max-w-md">
                    Descarga el proyecto con código Kotlin, Gradle y todos los recursos web offline incrustados en <code className="text-emerald-400 font-mono">app/src/main/assets/</code>.
                  </p>
                </div>

                <button
                  onClick={handleDownloadZip}
                  disabled={isDownloadingZip}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloadingZip ? 'Generando ZIP...' : 'Descargar Proyecto (.ZIP)'}</span>
                </button>
              </div>

              {downloadSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>
                    ¡Archivo <strong>AuraHiFi-AndroidStudio-Project.zip</strong> descargado con éxito!
                  </span>
                </div>
              )}

              {/* Code preview inspection */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Archivos del proyecto:
                  </div>
                  <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-xs overflow-x-auto">
                    <button
                      onClick={() => setSelectedFileCode('main')}
                      className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                        selectedFileCode === 'main'
                          ? 'bg-zinc-800 text-white font-medium'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      MainActivity.kt
                    </button>
                    <button
                      onClick={() => setSelectedFileCode('manifest')}
                      className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                        selectedFileCode === 'manifest'
                          ? 'bg-zinc-800 text-white font-medium'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      AndroidManifest.xml
                    </button>
                    <button
                      onClick={() => setSelectedFileCode('gradle')}
                      className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                        selectedFileCode === 'gradle'
                          ? 'bg-zinc-800 text-white font-medium'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      build.gradle.kts
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-3.5 max-h-48 overflow-y-auto">
                  <pre className="text-[11px] font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {selectedFileCode === 'main'
                      ? MAIN_ACTIVITY_KOTLIN
                      : selectedFileCode === 'manifest'
                      ? ANDROID_MANIFEST_XML
                      : APP_BUILD_GRADLE_KTS}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pwa' && (
            <div className="space-y-4">
              {/* Highlight Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/70 via-zinc-900 to-zinc-900 border border-emerald-500/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>La forma más rápida y sin desinstalar: Instalar como PWA</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Si instalas SpotyLuis directamente desde Chrome en tu móvil, <strong>se actualiza automáticamente en tiempo real</strong> en segundo plano cada vez que la abres. No tienes que descargar archivos APK, ni lidiar con avisos de Play Protect, ni desinstalar jamás.
                </p>
              </div>

              {/* URL Box */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                  Enlace para abrir en Chrome en tu móvil:
                </label>
                <div className="flex items-center gap-1.5 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                  <input
                    type="text"
                    readOnly
                    value={PRODUCTION_APP_URL}
                    className="flex-1 bg-zinc-950 border border-zinc-800/80 px-3 py-2 rounded-lg font-mono text-[11px] text-emerald-400 select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-zinc-950" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Step by step for Chrome Mobile */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Pasos para añadir a la pantalla de inicio en Chrome (Android):</span>
                </div>

                <ol className="text-xs text-zinc-300 space-y-2.5 list-decimal list-inside leading-relaxed">
                  <li>
                    Abre el navegador <strong>Google Chrome</strong> en tu móvil.
                  </li>
                  <li>
                    Pega o abre el enlace copiado arriba (o pulsa en <em>"Abrir en navegador"</em>). Asegúrate de tener iniciada tu sesión de Google (<code className="font-mono text-emerald-400">luismoncadapons@gmail.com</code>).
                  </li>
                  <li>
                    Pulsa el <strong>menú de tres puntos verticales (⋮)</strong> situado en la esquina superior derecha de Chrome.
                  </li>
                  <li>
                    Toca en <strong>"Añadir a pantalla de inicio"</strong> o <strong>"Instalar aplicación"</strong>.
                  </li>
                  <li>
                    Pulsa en <strong>"Instalar"</strong>. Se creará el icono de <strong>SpotyLuis</strong> en tu pantalla de inicio y se abrirá a pantalla completa como una app nativa.
                  </li>
                </ol>
              </div>

              {isInstallable && (
                <button
                  onClick={install}
                  className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Instalar SpotyLuis ahora en este dispositivo</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
