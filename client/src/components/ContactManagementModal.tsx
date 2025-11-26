import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { contactStatusAPI } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Pause, Play, Power, AlertCircle, ChevronDown } from "lucide-react";
import type { ContactStatus } from "@shared/instance-contact-status.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

interface ContactManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceNumber: string;
  instanceName: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  inactive: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function ContactManagementModal({
  open,
  onOpenChange,
  instanceNumber,
  instanceName,
}: ContactManagementModalProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [pauseDuration, setPauseDuration] = useState(3600000); // 1 hora em ms
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "paused" | "inactive">("all");
  const [selectedContactForPause, setSelectedContactForPause] = useState<string | null>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: [`/api/instances/${instanceNumber}/contacts`],
    queryFn: () => contactStatusAPI.getContacts(instanceNumber),
    enabled: open,
  });

  const { data: stats } = useQuery({
    queryKey: [`/api/instances/${instanceNumber}/contacts/stats`],
    queryFn: () => contactStatusAPI.getStats(instanceNumber),
    enabled: open,
  });

  const pauseMutation = useMutation({
    mutationFn: (contactJid: string) =>
      contactStatusAPI.pauseContact(instanceNumber, contactJid, {
        duration: pauseDuration,
        reason: "Pausado via dashboard",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/instances/${instanceNumber}/contacts`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/instances/${instanceNumber}/contacts/stats`],
      });
      toast({
        title: "Contato pausado",
        description: "O contato foi pausado com sucesso.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao pausar o contato.",
      });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (contactJid: string) =>
      contactStatusAPI.resumeContact(instanceNumber, contactJid),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/instances/${instanceNumber}/contacts`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/instances/${instanceNumber}/contacts/stats`],
      });
      toast({
        title: "Contato retomado",
        description: "O contato foi retomado com sucesso.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao retomar o contato.",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (contactJid: string) =>
      contactStatusAPI.deactivateContact(instanceNumber, contactJid, {
        reason: "Desativado via dashboard",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/instances/${instanceNumber}/contacts`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/instances/${instanceNumber}/contacts/stats`],
      });
      toast({
        title: "Contato desativado",
        description: "O contato foi desativado com sucesso.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao desativar o contato.",
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (contactJid: string) =>
      contactStatusAPI.activateContact(instanceNumber, contactJid),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/instances/${instanceNumber}/contacts`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/instances/${instanceNumber}/contacts/stats`],
      });
      toast({
        title: "Contato ativado",
        description: "O contato foi ativado com sucesso.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao ativar o contato.",
      });
    },
  });

  const filteredContacts = contacts.filter((contact: ContactStatus) => {
    const matchesSearch =
      contact.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.contact_jid?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || contact.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Gerenciar Contatos - {instanceName}</DialogTitle>
          <DialogDescription>
            Pause, retome ou desative contatos para esta instância
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                <div className="text-sm font-medium text-green-700 dark:text-green-400">
                  Ativos
                </div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-200">
                  {stats.data?.active || 0}
                </div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                <div className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  Pausados
                </div>
                <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">
                  {stats.data?.paused || 0}
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                <div className="text-sm font-medium text-red-700 dark:text-red-400">
                  Inativos
                </div>
                <div className="text-2xl font-bold text-red-900 dark:text-red-200">
                  {stats.data?.inactive || 0}
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Total
                </div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                  {stats.data?.total || 0}
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por nome ou JID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as any)
              }
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="paused">Pausados</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>

          {/* Contact List */}
          <ScrollArea className="h-[400px] border rounded-md p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <p>Nenhum contato encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredContacts.map((contact: ContactStatus) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{contact.contact_name || contact.contact_jid}</div>
                      <div className="text-xs text-gray-500">{contact.contact_jid}</div>
                    </div>

                    <Badge className={statusColors[contact.status]}>
                      {contact.status === "active"
                        ? "Ativo"
                        : contact.status === "paused"
                          ? "Pausado"
                          : "Inativo"}
                    </Badge>

                    <div className="flex gap-2 ml-2">
                      {contact.status === "active" && (
                        <DropdownMenu open={selectedContactForPause === contact.contact_jid} onOpenChange={(open) => setSelectedContactForPause(open ? contact.contact_jid : null)}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1"
                              disabled={pauseMutation.isPending || deactivateMutation.isPending}
                            >
                              {pauseMutation.isPending || deactivateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <span>Ações</span>
                                  <ChevronDown className="w-4 h-4" />
                                </>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <Pause className="w-4 h-4 mr-2" />
                                <span>Pausar</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {[
                                  { value: 300000, label: "5 minutos" },
                                  { value: 900000, label: "15 minutos" },
                                  { value: 1800000, label: "30 minutos" },
                                  { value: 3600000, label: "1 hora" },
                                  { value: 7200000, label: "2 horas" },
                                ].map((option) => (
                                  <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => {
                                      setSelectedContactForPause(null);
                                      contactStatusAPI
                                        .pauseContact(instanceNumber, contact.contact_jid, {
                                          duration: option.value,
                                          reason: "Pausado via dashboard",
                                        })
                                        .then(() => {
                                          queryClient.invalidateQueries({
                                            queryKey: [`/api/instances/${instanceNumber}/contacts`],
                                          });
                                          queryClient.invalidateQueries({
                                            queryKey: [`/api/instances/${instanceNumber}/contacts/stats`],
                                          });
                                          toast({
                                            title: "Contato pausado",
                                            description: `Contato pausado por ${option.label}.`,
                                          });
                                        })
                                        .catch(() => {
                                          toast({
                                            variant: "destructive",
                                            title: "Erro",
                                            description: "Falha ao pausar o contato.",
                                          });
                                        });
                                    }}
                                  >
                                    <span>{option.label}</span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedContactForPause(null);
                                deactivateMutation.mutate(contact.contact_jid);
                              }}
                              disabled={deactivateMutation.isPending}
                            >
                              <Power className="w-4 h-4 mr-2" />
                              <span>Desativar</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {contact.status === "paused" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => resumeMutation.mutate(contact.contact_jid)}
                          disabled={resumeMutation.isPending}
                          className="gap-1"
                        >
                          {resumeMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              <span>Ativar</span>
                            </>
                          )}
                        </Button>
                      )}

                      {contact.status === "inactive" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => activateMutation.mutate(contact.contact_jid)}
                          disabled={activateMutation.isPending}
                          className="gap-1"
                        >
                          {activateMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              <span>Ativar</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
