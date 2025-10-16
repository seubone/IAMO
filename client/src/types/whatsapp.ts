export interface WhatsAppChat {
  id: string;
  remote_jid: string;
  name: string;
  unread_count: number;
  timestamp: number;
  profile_pic_url?: string;
  push_name?: string;
  last_message?: string;
  last_message_timestamp?: number;
}

export interface WhatsAppMessage {
  id: string;
  key_remote_jid: string;
  key_from_me: boolean;
  key_id: string;
  push_name?: string;
  message_type: string;
  message_text?: string;
  message_timestamp: number;
  message_quoted_text?: string;
  message_quoted_message?: any;
  message_media_url?: string;
  message_caption?: string;
  status?: string;
}
