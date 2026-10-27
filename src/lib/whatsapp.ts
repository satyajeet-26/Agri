// WhatsApp Message Generator and Deep Link Builder

import { formatArea } from "./area";

interface SprayWhatsAppParams {
  shopName: string;
  shopContact?: string;
  farmerName: string;
  farmerMobile: string;
  cropName: string;
  plotName: string;
  totalGuntha: number;
  day: number;
  time: string;
  medicineName: string;
  quantity: string;
  unit: string;
  waterQuantity: string;
  note: string;
}

interface FertilizerWhatsAppParams {
  shopName: string;
  shopContact?: string;
  farmerName: string;
  farmerMobile: string;
  cropName: string;
  plotName: string;
  totalGuntha: number;
  day: number;
  stage: string;
  fertilizerName: string;
  quantity: string;
  unit: string;
  applicationMethod: string;
  waterQuantity?: string;
  note: string;
}

export function generateSprayWhatsAppMessage(params: SprayWhatsAppParams): string {
  const area = formatArea(params.totalGuntha).formatted;

  return (
`🌿 *${params.shopName.toUpperCase()}* 🌿
🌾 *कृषी सल्लागार वेळापत्रक / Spray Advisory*

👨‍🌾 *शेतकरी:* ${params.farmerName}
🌱 *पीक:* ${params.cropName} (${params.plotName})
📐 *क्षेत्र:* ${area}
-----------------------------
🗓️ *दिवस:* ${params.day} वा दिवस
⏰ *वेळ:* ${params.time === "Morning" ? "सकाळ (Morning)" : "संध्याकाळ (Evening)"}
💊 *औषधाचे नाव:* ${params.medicineName}
⚖️ *प्रमाण:* ${params.quantity} ${params.unit}
💧 *पाणी प्रमाण:* ${params.waterQuantity}
-----------------------------
📝 *महत्त्वाच्या सूचना / Note:*
${params.note || "हवामानाचा अंदाज घेऊन फवारणी करावी. स्टिकरचा वापर करावा."}

– *${params.shopName}*
${params.shopContact ? `📞 संपर्क: ${params.shopContact}` : ""}`
  );
}

export function generateFertilizerWhatsAppMessage(params: FertilizerWhatsAppParams): string {
  const area = formatArea(params.totalGuntha).formatted;

  return (
`🌿 *${params.shopName.toUpperCase()}* 🌿
🌾 *खत व्यवस्थापन वेळापत्रक / Fertilizer Advisory*

👨‍🌾 *शेतकरी:* ${params.farmerName}
🌱 *पीक:* ${params.cropName} (${params.plotName})
📐 *क्षेत्र:* ${area}
-----------------------------
🗓️ *दिवस:* ${params.day} वा दिवस (${params.stage})
🧪 *खताचे नाव:* ${params.fertilizerName}
⚖️ *प्रमाण:* ${params.quantity} ${params.unit}
🚜 *वापर पद्धत:* ${params.applicationMethod}
${params.waterQuantity ? `💧 पाणी प्रमाण: ${params.waterQuantity}\n` : ""}-----------------------------
📝 *सूचना:* ${params.note || "वेळेवर पाणी व्यवस्थापन ठेवावे."}

– *${params.shopName}*
${params.shopContact ? `📞 संपर्क: ${params.shopContact}` : ""}`
  );
}

export function buildWhatsAppLink(whatsappNumber: string, message: string): string {
  // Clean phone number (strip spaces, dashes, +)
  let cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");
  // If 10 digit Indian number, prefix with 91
  if (cleanNumber.length === 10) {
    cleanNumber = `91${cleanNumber}`;
  }
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

