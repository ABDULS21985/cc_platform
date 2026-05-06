/**
 * Demo mode gate for the dashboard MOCK_* fallbacks.
 *
 * Real authenticated users should see actionable empty states, not
 * fictional sample data ("Adaeze Mbakwe paid you ₦18,500"). For
 * marketing/demo deploys, set NEXT_PUBLIC_USE_DEMO_DATA=true.
 *
 * Pattern at each call site:
 *
 *   if (list.length === 0) {
 *     setItems(useDemoData() ? MOCK : []);
 *     setUsingMock(useDemoData());
 *   }
 */
export function useDemoData(): boolean {
  return process.env.NEXT_PUBLIC_USE_DEMO_DATA === 'true';
}
