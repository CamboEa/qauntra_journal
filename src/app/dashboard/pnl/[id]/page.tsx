import { PnlAccountTabs } from "@/components/pnl/PnlAccountTabs";

type Props = { params: Promise<{ id: string }> };

export default async function PnlAccountPage({ params }: Props) {
  const { id } = await params;
  return <PnlAccountTabs accountId={id} />;
}
