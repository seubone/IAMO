import { MetricCard } from "@/components/MetricCard";
import { Zap, TrendingUp, DollarSign, MessageSquare, Target, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  return (
    <div className="flex flex-col h-screen overflow-y-auto">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-heading">Dashboard</h1>
            <p className="text-muted-foreground">Métricas de engajamento e performance</p>
          </div>
          <Select defaultValue="7d">
            <SelectTrigger className="w-40" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Taxa de Primeira Resposta"
            value="94.2%"
            trend="up"
            trendValue="+5.2%"
            subtitle="vs. período anterior"
            icon={<Zap className="h-4 w-4" />}
          />
          <MetricCard
            title="Conversão de Vendas"
            value="23.8%"
            trend="up"
            trendValue="+3.1%"
            subtitle="vs. período anterior"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <MetricCard
            title="Ticket Médio"
            value="R$ 347"
            trend="down"
            trendValue="-2.5%"
            subtitle="vs. período anterior"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard
            title="% IA nas Mensagens"
            value="87.3%"
            trend="neutral"
            trendValue="0.0%"
            subtitle="vs. período anterior"
            icon={<MessageSquare className="h-4 w-4" />}
          />
          <MetricCard
            title="Conversão de Orçamentos"
            value="42.1%"
            trend="up"
            trendValue="+7.8%"
            subtitle="vs. período anterior"
            icon={<Target className="h-4 w-4" />}
          />
          <MetricCard
            title="Leads Atendidos"
            value="1,247"
            trend="up"
            trendValue="+12.3%"
            subtitle="vs. período anterior"
            icon={<Users className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance por IA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "IA Vendas WhatsApp", conversion: "28.3%", messages: "456" },
                  { name: "IA Suporte Email", conversion: "18.7%", messages: "892" },
                  { name: "IA Marketing", conversion: "31.2%", messages: "234" },
                ].map((ia) => (
                  <div key={ia.name} className="flex items-center justify-between pb-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{ia.name}</p>
                      <p className="text-xs text-muted-foreground">{ia.messages} mensagens</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{ia.conversion}</p>
                      <p className="text-xs text-muted-foreground">conversão</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversão de Links de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Links Enviados</span>
                  <span className="font-semibold">347</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pagamentos Concluídos</span>
                  <span className="font-semibold text-chart-3">198</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Taxa de Conversão</span>
                  <span className="font-semibold text-primary">57.1%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
