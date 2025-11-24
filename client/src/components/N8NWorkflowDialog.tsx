import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Trash2, Plus, Play, ToggleLeft, ToggleRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { InstanceN8NWorkflow } from "@shared/instance-workflow.types";

interface N8NWorkflowDialogProps {
  instanceNumber: string;
  instanceId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function N8NWorkflowDialog({
  instanceNumber,
  instanceId,
  open: controlledOpen,
  onOpenChange: onControlledOpenChange,
}: N8NWorkflowDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [workflows, setWorkflows] = useState<InstanceN8NWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    workflow_id: "",
    workflow_name: "",
    webhook_url: "",
    trigger_type: "webhook" as const,
    config: "{}",
  });

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onControlledOpenChange || setInternalOpen;

  // Fetch workflows
  useEffect(() => {
    if (open) {
      fetchWorkflows();
    }
  }, [open]);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      const response = await fetch(
        `/api/instances/${instanceNumber}/workflows`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch workflows");
      const data = await response.json();
      setWorkflows(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch workflows");
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorkflow = async () => {
    try {
      setError(null);
      setSuccessMessage(null);

      // Validation
      if (!formData.workflow_id || !formData.workflow_name) {
        setError("Workflow ID and Name are required");
        return;
      }

      if (formData.trigger_type === "webhook" && !formData.webhook_url) {
        setError("Webhook URL is required for webhook trigger type");
        return;
      }

      // Parse config
      let parsedConfig = {};
      if (formData.config) {
        try {
          parsedConfig = JSON.parse(formData.config);
        } catch {
          setError("Invalid JSON in config field");
          return;
        }
      }

      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/instances/${instanceNumber}/workflows`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            instance_id: instanceId,
            workflow_id: formData.workflow_id,
            workflow_name: formData.workflow_name,
            webhook_url: formData.webhook_url || undefined,
            trigger_type: formData.trigger_type,
            config: parsedConfig,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create workflow");
      }

      setSuccessMessage("Workflow added successfully!");
      setFormData({
        workflow_id: "",
        workflow_name: "",
        webhook_url: "",
        trigger_type: "webhook",
        config: "{}",
      });

      // Refresh workflows
      await fetchWorkflows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add workflow");
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm("Are you sure you want to delete this workflow?")) return;

    try {
      setError(null);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/instances/${instanceNumber}/workflows/${workflowId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete workflow");

      setSuccessMessage("Workflow deleted successfully!");
      await fetchWorkflows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete workflow");
    }
  };

  const handleToggleWorkflow = async (workflow: InstanceN8NWorkflow) => {
    try {
      setError(null);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/instances/${instanceNumber}/workflows/${workflow.workflow_id}/toggle`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to toggle workflow");

      setSuccessMessage(`Workflow ${workflow.is_active ? "deactivated" : "activated"}!`);
      await fetchWorkflows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle workflow");
    }
  };

  const handleTriggerWorkflow = async (workflowId: string) => {
    try {
      setError(null);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/instances/${instanceNumber}/workflows/${workflowId}/trigger`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ payload: {} }),
        }
      );

      if (!response.ok) throw new Error("Failed to trigger workflow");

      setSuccessMessage("Workflow triggered successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger workflow");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Workflows
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>N8N Workflows Configuration</DialogTitle>
          <DialogDescription>
            Manage N8N workflows for instance {instanceNumber}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="workflows" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="workflows">Active Workflows</TabsTrigger>
            <TabsTrigger value="add">Add New Workflow</TabsTrigger>
          </TabsList>

          {/* Active Workflows Tab */}
          <TabsContent value="workflows" className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="border-green-200 bg-green-50">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading workflows...</div>
            ) : workflows.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No workflows configured yet</div>
            ) : (
              <div className="space-y-3">
                {workflows.map((workflow) => (
                  <Card key={workflow.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{workflow.workflow_name}</CardTitle>
                          <CardDescription className="text-xs">
                            ID: {workflow.workflow_id} • Type: {workflow.trigger_type}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleWorkflow(workflow)}
                            title={workflow.is_active ? "Deactivate" : "Activate"}
                          >
                            {workflow.is_active ? (
                              <ToggleRight className="w-4 h-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTriggerWorkflow(workflow.workflow_id)}
                            title="Test trigger"
                          >
                            <Play className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteWorkflow(workflow.workflow_id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {workflow.webhook_url && (
                        <div>
                          <Label className="text-xs font-semibold">Webhook URL</Label>
                          <div className="text-xs break-all bg-gray-50 p-2 rounded border">
                            {workflow.webhook_url}
                          </div>
                        </div>
                      )}
                      {workflow.last_triggered_at && (
                        <div className="text-xs text-gray-600">
                          Last triggered: {new Date(workflow.last_triggered_at).toLocaleString()}
                        </div>
                      )}
                      {workflow.last_error_message && (
                        <div className="text-xs text-red-600">
                          Last error: {workflow.last_error_message}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Add Workflow Tab */}
          <TabsContent value="add" className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="border-green-200 bg-green-50">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="workflow_id">Workflow ID *</Label>
                <Input
                  id="workflow_id"
                  placeholder="e.g., auto-reply-001"
                  value={formData.workflow_id}
                  onChange={(e) =>
                    setFormData({ ...formData, workflow_id: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="workflow_name">Workflow Name *</Label>
                <Input
                  id="workflow_name"
                  placeholder="e.g., Auto Reply Bot"
                  value={formData.workflow_name}
                  onChange={(e) =>
                    setFormData({ ...formData, workflow_name: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="trigger_type">Trigger Type *</Label>
                <Select
                  value={formData.trigger_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, trigger_type: value as any })
                  }
                >
                  <SelectTrigger id="trigger_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="schedule">Schedule</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="trigger_node">Trigger Node</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.trigger_type === "webhook" && (
                <div>
                  <Label htmlFor="webhook_url">Webhook URL *</Label>
                  <Input
                    id="webhook_url"
                    placeholder="https://n8n.example.com/webhook/..."
                    value={formData.webhook_url}
                    onChange={(e) =>
                      setFormData({ ...formData, webhook_url: e.target.value })
                    }
                  />
                </div>
              )}

              <div>
                <Label htmlFor="config">Configuration (JSON)</Label>
                <textarea
                  id="config"
                  placeholder='{"max_retries": 3, "timeout_ms": 5000}'
                  value={formData.config}
                  onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                  rows={4}
                />
              </div>

              <Button onClick={handleAddWorkflow} className="w-full" disabled={loading}>
                {loading ? "Adding..." : "Add Workflow"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
