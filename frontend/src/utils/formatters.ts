import { ethers } from 'ethers';

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(38)}`;
}

export function formatHash(hash: string): string {
  if (!hash) return '';
  return `${hash.substring(0, 10)}...${hash.substring(58)}`;
}

export function formatTokenAmount(amount: bigint, decimals: number = 18, displayDecimals: number = 4): string {
  const formatted = ethers.formatUnits(amount, decimals);
  const num = parseFloat(formatted);

  if (num === 0) return '0';
  if (num < 0.0001) return '< 0.0001';

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals,
  });
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatPrice(price: bigint, decimals: number = 18): string {
  const formatted = ethers.formatUnits(price, decimals);
  const num = parseFloat(formatted);

  if (num === 0) return '0';

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  });
}

export function calculatePriceDifference(priceA: bigint, priceB: bigint): number {
  if (priceA === BigInt(0) || priceB === BigInt(0)) return 0;

  const numA = Number(priceA);
  const numB = Number(priceB);

  const diff = Math.abs(numA - numB);
  const avg = (numA + numB) / 2;

  return (diff / avg) * 100;
}

export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  try {
    return ethers.parseUnits(amount || '0', decimals);
  } catch {
    return BigInt(0);
  }
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
