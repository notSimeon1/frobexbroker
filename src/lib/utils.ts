import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Fetches real-time spot crypto prices from the official public Bybit V5 API
 * Endpoint: GET https://api.bybit.com/v5/market/tickers?category=spot
 */
export async function fetchBybitCryptoPrices(symbols: string[] = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"]) {
  try {
    const response = await fetch("https://api.bybit.com/v5/market/tickers?category=spot", {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.retCode === 0 && data.result && Array.isArray(data.result.list)) {
      const priceMap: Record<string, number> = {};
      
      data.result.list.forEach((ticker: any) => {
        if (symbols.includes(ticker.symbol)) {
          priceMap[ticker.symbol] = parseFloat(ticker.lastPrice);
        }
      });

      return priceMap;
    }
    throw new Error(data.retMsg || "Invalid response from Bybit API");
  } catch (error) {
    console.error("Failed to fetch live crypto prices from Bybit:", error);
    return null;
  }
}
