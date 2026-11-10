"use client";

import Link from "next/link";
import { Bell, MessageCircle, Sprout } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";

export default function WhatsAppNotificationsPage() {
  const { lang } = useLanguage();
  const tr = (en: string, mr: string) => (lang === "mr" ? mr : en);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-slate-800">
          {tr("Schedule Reminders", "वेळापत्रक स्मरणपत्रे")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {tr(
            "Simple mode: dates show automatically in the Farmer Panel; WhatsApp messages are sent manually by an admin.",
            "सोपे स्वरूप: तारखा शेतकरी पॅनेलमध्ये आपोआप दिसतात; WhatsApp संदेश प्रशासकाकडून हाताने पाठवले जातात."
          )}
        </p>
      </header>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div className="space-y-2 text-sm">
            <h2 className="font-bold">
              {tr("No WhatsApp API setup is needed", "WhatsApp API सेटअपची गरज नाही")}
            </h2>
            <p>
              {tr(
                "When an admin sets a spray or fertilizer date, the farmer sees it in the Farmer Panel's Today view on that date and in the schedule list with its date.",
                "प्रशासक फवारणी किंवा खताची तारीख ठरवल्यावर, त्या दिवशी शेतकऱ्याला ती शेतकरी पॅनेलच्या आजच्या दृश्यात आणि तारखेसह वेळापत्रक यादीत दिसते."
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div className="space-y-2 text-sm text-slate-700">
            <h2 className="font-bold text-slate-900">
              {tr("To send a Marathi WhatsApp reminder", "मराठी WhatsApp स्मरणपत्र पाठवण्यासाठी")}
            </h2>
            <ol className="list-inside list-decimal space-y-1">
              <li>{tr("Open Farmer Master and choose the farmer.", "शेतकरी मास्टर उघडा आणि शेतकरी निवडा.")}</li>
              <li>{tr("Select the plot and open its spray or fertilizer schedule.", "शेतजमीन निवडा आणि तिचे फवारणी किंवा खताचे वेळापत्रक उघडा.")}</li>
              <li>{tr('Click “Send WhatsApp” beside the schedule entry.', 'वेळापत्रक नोंदीजवळील “WhatsApp पाठवा” वर क्लिक करा.')}</li>
              <li>{tr("WhatsApp opens with the prepared message; review it and tap Send.", "तयार संदेशासह WhatsApp उघडेल; संदेश तपासून पाठवा वर टॅप करा.")}</li>
            </ol>
            <p className="text-xs text-slate-500">
              {tr(
                "WhatsApp must be available on the device. The admin manually confirms each send.",
                "डिव्हाइसवर WhatsApp उपलब्ध असणे आवश्यक आहे. प्रशासक प्रत्येक पाठवण्याची कृती स्वतः पुष्टी करतो."
              )}
            </p>
          </div>
        </div>
      </section>

      <Link
        href="/admin/farmers"
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
      >
        <Sprout className="h-4 w-4" />
        {tr("Open Farmer Master", "शेतकरी मास्टर उघडा")}
      </Link>
    </div>
  );
}
