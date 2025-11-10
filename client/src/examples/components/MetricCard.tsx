import { MetricCard } from '../MetricCard';
import { Zap, TrendingUp, DollarSign, MessageSquare } from 'lucide-react';

export default function MetricCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <MetricCard
        title="Taxa de Primeira Resposta"
        value="94.2%"
        trend="up"
        trendValue="+5.2%"
        subtitle="vs. mês anterior"
        icon={<Zap className="h-4 w-4" />}
      />
      <MetricCard
        title="Conversão de Vendas"
        value="23.8%"
        trend="up"
        trendValue="+3.1%"
        subtitle="vs. mês anterior"
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <MetricCard
        title="Ticket Médio"
        value="R$ 347"
        trend="down"
        trendValue="-2.5%"
        subtitle="vs. mês anterior"
        icon={<DollarSign className="h-4 w-4" />}
      />
      <MetricCard
        title="% IA nas Mensagens"
        value="87.3%"
        trend="neutral"
        trendValue="0.0%"
        subtitle="vs. mês anterior"
        icon={<MessageSquare className="h-4 w-4" />}
      />
    </div>
  );
}
