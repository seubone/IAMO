import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Plus, Loader2 } from "lucide-react";

interface ContactMetadataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
  remoteJid: string;
  contactName?: string;
}

interface ContactMetadata {
  id?: string;
  instanceId: string;
  remoteJid: string;
  tags: string[];
  customFields: Record<string, string>;
  notes: string | null;
}

export function ContactMetadataDialog({
  isOpen,
  onClose,
  instanceId,
  remoteJid,
  contactName,
}: ContactMetadataDialogProps) {
  const { toast } = useToast();
  const [newTag, setNewTag] = useState("");
  const [customFieldKey, setCustomFieldKey] = useState("");
  const [customFieldValue, setCustomFieldValue] = useState("");
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [localCustomFields, setLocalCustomFields] = useState<Record<string, string>>({});
  const [localNotes, setLocalNotes] = useState("");

  // Fetch metadata
  const { data: metadata, isLoading } = useQuery<ContactMetadata>({
    queryKey: ["/api/contact-metadata", instanceId, remoteJid],
    queryFn: async () => {
      const response = await fetch(`/api/contact-metadata/${instanceId}/${remoteJid}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch metadata");
      return response.json();
    },
    enabled: isOpen,
  });

  // Initialize local state when metadata loads
  useEffect(() => {
    if (metadata) {
      setLocalTags(metadata.tags || []);
      setLocalCustomFields(metadata.customFields || {});
      setLocalNotes(metadata.notes || "");
    }
  }, [metadata]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ContactMetadata>) => {
      return apiRequest("/api/contact-metadata", {
        method: "POST",
        body: JSON.stringify({
          instanceId,
          remoteJid,
          ...data,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-metadata", instanceId, remoteJid] });
      toast({
        title: "✅ Metadados salvos",
        description: "Tags e campos personalizados foram atualizados.",
      });
      onClose();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "❌ Erro ao salvar",
        description: "Não foi possível salvar os metadados.",
      });
    },
  });

  const handleAddTag = () => {
    if (newTag.trim() && !localTags.includes(newTag.trim())) {
      setLocalTags([...localTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setLocalTags(localTags.filter((t) => t !== tag));
  };

  const handleAddCustomField = () => {
    if (customFieldKey.trim() && customFieldValue.trim()) {
      setLocalCustomFields({ ...localCustomFields, [customFieldKey.trim()]: customFieldValue.trim() });
      setCustomFieldKey("");
      setCustomFieldValue("");
    }
  };

  const handleRemoveCustomField = (key: string) => {
    const updated = { ...localCustomFields };
    delete updated[key];
    setLocalCustomFields(updated);
  };

  const handleSave = () => {
    saveMutation.mutate({
      tags: localTags,
      customFields: localCustomFields,
      notes: localNotes || null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Metadados do Contato - {contactName || remoteJid}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" data-testid="loader-metadata" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tags */}
            <div className="space-y-3">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Digite uma tag..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  data-testid="input-new-tag"
                />
                <Button onClick={handleAddTag} size="icon" data-testid="button-add-tag">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {localTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1" data-testid={`badge-tag-${tag}`}>
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleRemoveTag(tag)}
                      data-testid={`button-remove-tag-${tag}`}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Custom Fields */}
            <div className="space-y-3">
              <Label>Campos Personalizados</Label>
              <div className="flex gap-2">
                <Input
                  value={customFieldKey}
                  onChange={(e) => setCustomFieldKey(e.target.value)}
                  placeholder="Nome do campo..."
                  className="flex-1"
                  data-testid="input-custom-field-key"
                />
                <Input
                  value={customFieldValue}
                  onChange={(e) => setCustomFieldValue(e.target.value)}
                  placeholder="Valor..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomField()}
                  data-testid="input-custom-field-value"
                />
                <Button onClick={handleAddCustomField} size="icon" data-testid="button-add-custom-field">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {Object.entries(localCustomFields).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between bg-muted p-2 rounded-md" data-testid={`custom-field-${key}`}>
                    <div className="flex-1">
                      <span className="font-medium">{key}:</span> {value}
                    </div>
                    <X
                      className="h-4 w-4 cursor-pointer hover:text-destructive"
                      onClick={() => handleRemoveCustomField(key)}
                      data-testid={`button-remove-custom-field-${key}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <Label>Observações</Label>
              <Textarea
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                placeholder="Adicione observações sobre este contato..."
                rows={4}
                data-testid="textarea-notes"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-metadata">
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
