import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getWhatsappLinkStatus } from "@/core/functions/whatsapp"
import { ReportsSection } from "./ReportsSection"
import { WhatsAppSection } from "./WhatsAppSection"

export function AssistantCard() {
	const whatsappStatusQuery = useQuery({
		queryKey: ["whatsappLinkStatus"],
		queryFn: () => getWhatsappLinkStatus(),
		staleTime: 60 * 1000,
	})

	const isLinked = whatsappStatusQuery.data?.linked ?? false

	return (
		<Card>
			<CardHeader>
				<CardTitle>Assistant</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid gap-6">
					<WhatsAppSection />
					{isLinked && <ReportsSection />}
				</div>
			</CardContent>
		</Card>
	)
}
