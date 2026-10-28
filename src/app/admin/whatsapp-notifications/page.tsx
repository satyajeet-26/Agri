import Link from "next/link";
import { Bell, MessageCircle, Sprout } from "lucide-react";

export default function WhatsAppNotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-slate-800">
          Schedule Reminders
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Simple mode: dates show automatically in the Farmer Panel; WhatsApp messages are sent manually by an admin.
        </p>
      </header>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div className="space-y-2 text-sm">
            <h2 className="font-bold">No WhatsApp API setup is needed</h2>
            <p>
              When an admin sets a spray or fertilizer date, the farmer sees it in the Farmer Panel&apos;s
              Today view on that date and in the schedule list with its date.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div className="space-y-2 text-sm text-slate-700">
            <h2 className="font-bold text-slate-900">To send a Marathi WhatsApp reminder</h2>
            <ol className="list-inside list-decimal space-y-1">
              <li>Open Farmer Master and choose the farmer.</li>
              <li>Select the plot and open its spray or fertilizer schedule.</li>
              <li>Click “Send WhatsApp” beside the schedule entry.</li>
              <li>WhatsApp opens with the prepared message; review it and tap Send.</li>
            </ol>
            <p className="text-xs text-slate-500">
              WhatsApp must be available on the device. The admin manually confirms each send.
            </p>
          </div>
        </div>
      </section>

      <Link
        href="/admin/farmers"
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
      >
        <Sprout className="h-4 w-4" />
        Open Farmer Master
      </Link>
    </div>
  );
}
