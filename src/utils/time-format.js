export function formatTimeFrom(timestamp) {
  const now = Date.now();
  const diffMs = now - timestamp;
  
  // Cálculo das diferentes unidades de tempo
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  // Formatação com a unidade mais apropriada
  if (years > 0) {
    return `${years}a`; // Anos
  } else if (months > 0) {
    return `${months}m`; // Meses
  } else if (weeks > 0) {
    return `${weeks}sem`; // Semanas
  } else if (days > 0) {
    return `${days}d`; // Dias
  } else if (hours > 0) {
    return `${hours}h`; // Horas
  } else {
    return `${minutes}min`; // Minutos
  }
}