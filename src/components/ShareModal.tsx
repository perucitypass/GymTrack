import React, { useState } from 'react';
import { Smartphone, Copy, Check, X, QrCode, ExternalLink, Share2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Use current production URL or fallback
  const shareUrl =
    typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
      ? window.location.origin
      : 'https://ais-pre-sqtn5zfscnztwcr3ylrdax-493044584112.us-west1.run.app';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    shareUrl
  )}&bgcolor=0f172a&color=10b981&margin=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Abrir en tu Teléfono u otros Dispositivos
            </h3>
            <p className="text-xs text-slate-400">
              Escanea el código QR o copia el enlace directo
            </p>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-950/80 rounded-2xl border border-slate-800 mb-5">
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-md">
            <img
              src={qrImageUrl}
              alt="Código QR para ingresar a la app"
              className="w-44 h-44 rounded-lg"
              loading="lazy"
            />
          </div>
          <span className="text-[11px] text-slate-400 mt-2.5 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Escanea con la cámara de tu celular</span>
          </span>
        </div>

        {/* Copy Link Input Bar */}
        <div className="space-y-1.5 mb-5">
          <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Enlace Web Directo:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 select-all font-mono focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm ${
                copied
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile App Install Tips */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400 space-y-1.5">
          <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
            💡 Para usarla como App en tu pantalla de inicio:
          </div>
          <p className="text-[11px] leading-relaxed">
            • <strong className="text-slate-200">iPhone / Safari</strong>: Toca el botón <em>Compartir</em> (icono cuadrado con flecha hacia arriba) y selecciona <em>"Agregar a pantalla de inicio"</em>.
          </p>
          <p className="text-[11px] leading-relaxed">
            • <strong className="text-slate-200">Android / Chrome</strong>: Toca los <em>tres puntos</em> arriba a la derecha y selecciona <em>"Instalar aplicación"</em> o <em>"Agregar a la pantalla principal"</em>.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
