export interface NotificationPayload {
    object: "whatsapp_business_account";
    entry: Entry[];
}

export interface Entry {
  id: string;
  changes: Change[];
}

export type Change = MessagesChange;

export interface MessagesChange {
  field: "messages";
  value: MessagesValue;
}

export interface MessagesValue {
  metadata: Metadata;
  messaging_product: MessagingProduct;
  statuses?: StatusElement[];
  messages?: Message[];
  contacts?: Contact[];
}

export interface Contact {
  profile: Profile;
  wa_id: string;
}

export interface Profile {
  name: string;
}

export interface Message {
  from: string;
  id: string;
  text?: Text;
  type: string;
  timestamp: string;
  sticker?: Sticker;
}

export interface Sticker {
  sha256: string;
  mime_type: string;
  animated: boolean;
  id: string;
}

export interface Text {
  body: string;
}

export type MessagingProduct = "whatsapp";

export interface Metadata {
  phone_number_id: string;
  display_phone_number: string;
}

export interface StatusElement {
  biz_opaque_callback_data?: string;
  id: string;
  conversation?: Conversation;
  pricing?: Pricing;
  status: StatusEnum;
  timestamp: string;
  recipient_id: string;
  errors?: Error[];
}

export interface Conversation {
  origin: Origin;
  id: string;
  expiration_timestamp?: string;
}

export interface Origin {
  type: Category;
}

export type Category = "marketing" | "utility";

export interface Error {
  code: number;
  title: string;
  message: string;
  error_data: ErrorData;
}

export interface ErrorData {
  details: string;
}

export interface Pricing {
  pricing_model: PricingModel;
  category: Category;
  billable: boolean;
}

export type PricingModel = "CBP";

export type StatusEnum = "delivered" | "failed" | "read" | "sent";