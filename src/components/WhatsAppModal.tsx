"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Send, Copy, Check, X } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/whatsapp";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmerName: string;
  whatsappNumber: string;
  initialMessage: string;
}

export function WhatsAppModal({
  isOpen,
  onClose,
  farmerName,
  whatsappNumber,
  initialMessage,
}: WhatsAppModalProps) {
  const [message, setMessage] = useState(initialMessage);
  const [copied, setCopied] = useState(false);
  const [prevInitial, setPrevInitial] = useState(initialMessage);

  if (initialMessage !== prevInitial) {
    setPrevInitial(initialMessage);
    setMessage(initialMessage);
  }

  if (!isOpen) return null;

  const handleSend = () => {
    const url = buildWhatsAppLink(whatsappNumber, message);
    window.open(url, "_blank");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-green-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Send WhatsApp Advisory</h3>
              <p className="text-xs text-emerald-100">
                To: <span className="font-semibold">{farmerName}</span> ({whatsappNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Preview */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              WhatsApp Message Preview & Customization
            </label>
            <textarea
              rows={11}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 leading-relaxed resize-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Tip: You can edit or append personal instructions above before sending.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={handleCopy}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Message Text</span>
                </>
              )}
            </button>

            <button
              onClick={handleSend}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.02]"
            >
              <Send className="w-4 h-4" />
              <span>Send via WhatsApp (१-क्लिक पाठवा)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
