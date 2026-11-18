import { calculateBusinessMetrics } from "./metricsEngine";
import { DEFAULT_BUSINESS_ID } from "@/lib/db";

export interface ForecastPoint {
  period: string;
  expected: number;
  lowerBound: number;
  upperBound: number;
  type: "historical" | "projected";
}

export interface BusinessForecastReport {
  metric: string;
  periods: ForecastPoint[];
  methodology: string;
  confidenceLevel: string;
  assumptions: string[];
  limitations: string[];
  growthRatePct: number;
  isSufficientData: boolean;
}

/**
 * Generate statistical forecast with moving average and confidence intervals
 */
export function generateMetricForecast(
  metricKey: "revenue" | "burn" = "revenue",
  businessId = DEFAULT_BUSINESS_ID,
  forecastMonths = 4
): BusinessForecastReport {
  const metrics = calculateBusinessMetrics(businessId);
  const history = metrics.history;
  const dataPoints = history.map(h => (metricKey === "revenue" ? h.revenue : h.burn));
  const metricName = metricKey === "revenue" ? "Monthly revenue" : "Monthly burn";

  const historical: ForecastPoint[] = history.map(h => {
    const val = metricKey === "revenue" ? h.revenue : h.burn;
    return { period: h.month, expected: val, lowerBound: val, upperBound: val, type: "historical" as const };
  });

  // A forecast needs at least 3 months of the business's own saved numbers. Until then there is nothing to project.
  if (dataPoints.length < 3) {
    return {
      metric: metricName,
      periods: historical,
      methodology: "Straight-line trend through your own monthly figures",
      confidenceLevel: "Not available",
      growthRatePct: 0,
      isSufficientData: false,
      assumptions: [],
      limitations: [
        `BizzPal has saved ${dataPoints.length} month${dataPoints.length === 1 ? "" : "s"} of your figures so far. A forecast needs at least 3. One snapshot is saved each month you use BizzPal, so this fills in by itself over time.`,
      ],
    };
  }

  const first = dataPoints[0];
  const last = dataPoints[dataPoints.length - 1];
  const overallGrowth = first > 0 ? (last - first) / first : 0;
  const monthlyDrift = overallGrowth / Math.max(1, dataPoints.length - 1);
  const mean = dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length;
  const stdDev = Math.sqrt(dataPoints.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / dataPoints.length);

  // Month names for the months after the last saved one
  const lastDate = new Date(`${history[history.length - 1].month} 1`);
  const projected: ForecastPoint[] = [];
  for (let m = 1; m <= forecastMonths; m++) {
    const value = Math.round(last * Math.pow(1 + monthlyDrift, m));
    const margin = Math.round(stdDev * 1.28 * Math.sqrt(m));
    const when = new Date(lastDate.getFullYear(), lastDate.getMonth() + m, 1);
    projected.push({
      period: when.toLocaleString("en-US", { month: "short", year: "numeric" }),
      expected: Math.max(0, value),
      lowerBound: Math.max(0, value - margin),
      upperBound: value + margin,
      type: "projected",
    });
  }

  return {
    metric: metricName,
    periods: [...historical, ...projected],
    methodology: "Straight-line trend through your own monthly figures, with an 80% range based on how much they varied",
    confidenceLevel: "80% range",
    growthRatePct: Number((monthlyDrift * 100).toFixed(1)),
    isSufficientData: true,
    assumptions: [`Assumes the average monthly change of ${(monthlyDrift * 100).toFixed(1)}% in your saved figures continues.`],
    limitations: [`Based on ${dataPoints.length} saved months. It cannot see future events such as new contracts, price changes or lost customers.`],
  };
}
