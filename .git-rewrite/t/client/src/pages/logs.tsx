import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, AlertCircle, Info, AlertTriangle, Bug, RefreshCw, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type LogLevel = "info" | "warning" | "error" | "debug" | "all";

interface SystemLog {
  id: string;
  level: string;
  source: string;
  message: string;
  details: any;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function Logs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  // Fetch logs
  const { data: logs = [], isLoading, refetch } = useQuery<SystemLog[]>({
    queryKey: ["/api/logs", { level: levelFilter !== "all" ? levelFilter : undefined, source: sourceFilter !== "all" ? sourceFilter : undefined, search: searchQuery || undefined }],
  });

  // Fetch sources for filter
  const { data: sources = [] } = useQuery<string[]>({
    queryKey: ["/api/logs/sources"],
  });

  // Fetch stats
  const { data: stats = [] } = useQuery<{level: string; count: number}[]>({
    queryKey: ["/api/logs/stats"],
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "info":
        return <Info className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "debug":
        return <Bug className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getLevelBadgeVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case "info":
        return "default";
      case "warning":
        return "secondary";
      case "error":
        return "destructive";
      case "debug":
        return "outline";
      default:
        return "default";
    }
  };

  const exportLogs = () => {
    const csv = [
      ["Nível", "Fonte", "Mensagem", "Data/Hora"],
      ...logs.map(log => [
        log.level,
        log.source,
        log.message,
        format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs_${format(new Date(), "yyyy-MM-dd_HH-mm-ss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatCount = (level: string) => {
    return stats.find(s => s.level === level)?.count || 0;
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-card/50 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Logs do Sistema</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize e filtre logs de atividades do sistema
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs} disabled={logs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex-shrink-0 px-6 py-4 grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Info</p>
              <p className="text-2xl font-bold">{getStatCount("info")}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <AlertTriangle className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avisos</p>
              <p className="text-2xl font-bold">{getStatCount("warning")}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Erros</p>
              <p className="text-2xl font-bold">{getStatCount("error")}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Bug className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Debug</p>
              <p className="text-2xl font-bold">{getStatCount("debug")}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 px-6 py-3 flex items-center gap-3 border-b bg-muted/20">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as LogLevel)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Nível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Níveis</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Avisos</SelectItem>
            <SelectItem value="error">Erros</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Fontes</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source} value={source}>
                {source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Nível</TableHead>
                <TableHead className="w-[150px]">Fonte</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead className="w-[180px]">Data/Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Carregando logs...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum log encontrado
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Badge variant={getLevelBadgeVariant(log.level)} className="flex items-center gap-1 w-fit">
                        {getLevelIcon(log.level)}
                        {log.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{log.source}</code>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">{log.message}</p>
                        {log.details && (
                          <details className="text-xs text-muted-foreground">
                            <summary className="cursor-pointer hover:text-foreground">Detalhes</summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
