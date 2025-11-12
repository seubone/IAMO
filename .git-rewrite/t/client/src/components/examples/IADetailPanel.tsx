import { IADetailPanel } from '../IADetailPanel';

export default function IADetailPanelExample() {
  const mockActions = [
    {
      id: "1",
      action: "IA Pausada",
      user: "João Silva",
      reason: "Taxa de conversão abaixo de 20% nas últimas 24h",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "2",
      action: "IA Ativada",
      user: "Maria Santos",
      reason: "Prompt atualizado com novas objeções",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "3",
      action: "IA Pausada",
      user: "Pedro Costa",
      reason: "Muitas reclamações sobre respostas inadequadas",
      timestamp: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  return (
    <div className="h-[600px] w-80 border rounded-lg bg-card">
      <IADetailPanel
        iaName="IA Vendas WhatsApp"
        status="paused"
        onActivate={() => console.log('Ativar IA')}
        onPause={() => console.log('Pausar IA')}
        onDeactivate={() => console.log('Inativar IA')}
        actions={mockActions}
      />
    </div>
  );
}
