// Acre & Guntha Helper Functions (1 Acre = 40 Guntha)

export function calculateTotalGuntha(acre: number, guntha: number): number {
  const safeAcre = Number(acre) || 0;
  const safeGuntha = Number(guntha) || 0;
  return safeAcre * 40 + safeGuntha;
}

export function formatArea(totalGuntha: number): {
  acre: number;
  guntha: number;
  formatted: string;
} {
  const safeTotal = Number(totalGuntha) || 0;
  const acre = Math.floor(safeTotal / 40);
  const guntha = safeTotal % 40;

  let formatted = "";
  if (acre > 0 && guntha > 0) {
    formatted = `${acre} Acre ${guntha} Guntha`;
  } else if (acre > 0) {
    formatted = `${acre} Acre`;
  } else {
    formatted = `${guntha} Guntha`;
  }

  return { acre, guntha, formatted };
}

export function formatAcreGunthaInput(acre: number, guntha: number): string {
  const total = calculateTotalGuntha(acre, guntha);
  return formatArea(total).formatted;
}

