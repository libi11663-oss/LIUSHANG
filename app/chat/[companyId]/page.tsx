import { Metadata } from "next";
import { getCompanyRecord, getCompanyRecordByWidgetId } from "@/lib/saas/knowledge-service";
import HostedChatClient from "./HostedChatClient";

interface PageProps {
  params: Promise<{ companyId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { companyId } = await params;
  const company =
    (await getCompanyRecord(companyId)) ||
    (await getCompanyRecordByWidgetId(companyId));

  if (!company) {
    return {
      title: "AI 智慧客服",
      description: "24 小時線上智慧諮詢服務"
    };
  }

  const { companyName, assistantName, tagline } = company.publicConfig;
  return {
    title: `${assistantName} — ${companyName}`,
    description: tagline || `${companyName} 專屬 24 小時 AI 智慧客服諮詢`,
    openGraph: {
      title: `${assistantName} — ${companyName}`,
      description: tagline || `${companyName} 專屬 24 小時 AI 智慧客服諮詢`
    }
  };
}

export default async function HostedChatPage({ params }: PageProps) {
  const { companyId } = await params;
  const company =
    (await getCompanyRecord(companyId)) ||
    (await getCompanyRecordByWidgetId(companyId));

  return (
    <HostedChatClient
      initialCompany={company ? company.publicConfig : null}
      targetId={companyId}
    />
  );
}
