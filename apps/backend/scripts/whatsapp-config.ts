export type BotCommand = {
	command_name: string
	command_description: string
}

export type ConversationalAutomationConfig = {
	enable_welcome_message: boolean
	prompts: string[]
	commands: BotCommand[]
}

export type TemplateButton = {
	type: "QUICK_REPLY"
	text: string
}

export type TemplateComponent =
	| {
			type: "BODY"
			text: string
			example: {
				body_text: string[][]
			}
	  }
	| {
			type: "BUTTONS"
			buttons: TemplateButton[]
	  }

export type MessageTemplateConfig = {
	name: string
	language: string
	category: "UTILITY"
	components: TemplateComponent[]
}

export const conversationalAutomation: ConversationalAutomationConfig = {
	enable_welcome_message: true,
	prompts: [
		"What can you do?",
		"Log my first expense",
		"How do reports work?",
		"Change my currency or timezone",
	],
	commands: [
		{
			command_name: "help",
			command_description: "See what I can do and how to talk to me",
		},
		{
			command_name: "new",
			command_description:
				"Start a fresh conversation (your expenses are kept)",
		},
		{
			command_name: "settings",
			command_description:
				"Show your current settings: currencies, timezone, report schedule",
		},
		{
			command_name: "start",
			command_description: "Replay the welcome tour",
		},
		{
			command_name: "pair",
			command_description:
				"Share expenses with a partner: /pair <phone number>",
		},
		{
			command_name: "unpair",
			command_description: "Stop sharing expenses with your partner",
		},
	],
}

export const messageTemplates: MessageTemplateConfig[] = [
	{
		name: "report_ready",
		language: "en",
		category: "UTILITY",
		components: [
			{
				type: "BODY",
				text: "Your {{1}} spending report is ready. Tap below and I'll send it over.",
				example: {
					body_text: [["weekly"]],
				},
			},
			{
				type: "BUTTONS",
				buttons: [
					{
						type: "QUICK_REPLY",
						text: "Show report",
					},
				],
			},
		],
	},
]
