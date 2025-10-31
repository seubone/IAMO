// Evolution Database Types

export interface EvolutionInstance {
  id: string;
  name: string;
  number?: string;
  ownerJid?: string;
  profilePicUrl?: string;
  profileName?: string;
  connectionStatus: string;
}

export interface EvolutionChat {
  id: string;
  remoteJid: string;
  name?: string;
  unreadMessages: number;
  createdAt: string;
  updatedAt: string;
  profilePicUrl?: string;
  pushName?: string;
  last_message?: string;
  last_message_timestamp?: number;
}

export interface EvolutionMessage {
  id: string;
  key: {
    id: string;
    fromMe: boolean;
    remoteJid: string;
    participant?: string;
  };
  pushName?: string;
  participant?: string;
  messageType: string;
  message: {
    conversation?: string;
    imageMessage?: {
      url?: string;
      caption?: string;
      mimetype?: string;
    };
    stickerMessage?: {
      url?: string;
      mimetype?: string;
    };
    audioMessage?: {
      url?: string;
      mimetype?: string;
      seconds?: number;
    };
    documentMessage?: {
      url?: string;
      mimetype?: string;
      fileName?: string;
      caption?: string;
    };
    videoMessage?: {
      url?: string;
      caption?: string;
      mimetype?: string;
      seconds?: number;
    };
    locationMessage?: {
      degreesLatitude?: number;
      degreesLongitude?: number;
      name?: string;
      address?: string;
    };
    contactMessage?: {
      displayName?: string;
      vcard?: string;
    };
    reactionMessage?: {
      key?: any;
      text?: string;
    };
    editedMessage?: {
      message?: any;
      timestampMs?: string;
    };
    ptvMessage?: {
      url?: string;
      mimetype?: string;
      seconds?: number;
    };
  };
  contextInfo?: {
    quotedMessage?: any;
    stanzaId?: string;
  };
  messageTimestamp: number;
  status?: string;
}
