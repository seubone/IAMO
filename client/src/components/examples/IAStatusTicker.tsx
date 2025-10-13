import { IAStatusTicker } from '../IAStatusTicker';

export default function IAStatusTickerExample() {
  const mockItems = [
    { id: "1", name: "IA Vendas WhatsApp", status: "active" as const },
    { id: "2", name: "IA Suporte Email", status: "paused" as const },
    { id: "3", name: "IA Marketing", status: "active" as const },
    { id: "4", name: "IA Cobrança", status: "inactive" as const },
    { id: "5", name: "IA Onboarding", status: "active" as const },
    { id: "6", name: "IA Retenção", status: "paused" as const },
  ];

  return <IAStatusTicker items={mockItems} />;
}
