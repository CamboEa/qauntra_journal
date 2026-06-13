import { BotDetail } from "@/components/bots/BotDetail";

type BotDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BotDetailPage({ params }: BotDetailPageProps) {
  const { id } = await params;
  return <BotDetail botId={id} />;
}
