import { IndicatorSetup } from "@/components/IndicatorSetup";
import { SetupBanner } from "@/components/SetupBanner";
import { isUserConnected } from "@/lib/env";
import { isFirebaseConfigured } from "@/lib/firebase/admin";

type DashboardGateProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export async function DashboardGate({
  title,
  description,
  children,
}: DashboardGateProps) {
  const firebaseOk = isFirebaseConfigured();
  const linked = firebaseOk && (await isUserConnected());

  if (!firebaseOk) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-q-text">{title}</h1>
          <p className="mt-1 text-sm text-q-text-2">{description}</p>
        </header>
        <SetupBanner />
      </div>
    );
  }

  if (!linked) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-q-text">{title}</h1>
          <p className="mt-1 text-sm text-q-text-2">{description}</p>
        </header>
        <IndicatorSetup />
      </div>
    );
  }

  return <>{children}</>;
}
