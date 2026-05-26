import { IndicatorSetup } from "@/components/IndicatorSetup";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-q-text">MT5 setup</h1>
        <p className="mt-1 text-sm text-q-text-2">
          Install and configure the QuatraSync indicator to sync trades to Firebase.
        </p>
      </header>
      <IndicatorSetup />
    </div>
  );
}
