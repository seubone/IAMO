/**
 * Instance N8N Workflow Types
 * Manages associations between Evolution WhatsApp instances and N8N workflows
 */

export type N8NWorkflowTriggerType = 'webhook' | 'schedule' | 'manual' | 'trigger_node' | 'other';

export interface InstanceN8NWorkflow {
  id: number;

  // Instance Reference
  instance_id: string;
  instance_number: string;

  // N8N Workflow Configuration
  workflow_id: string;
  workflow_name: string;
  webhook_url?: string;
  trigger_type: N8NWorkflowTriggerType;

  // Workflow Status
  is_active: boolean;
  last_triggered_at?: string;
  last_error_message?: string;
  last_error_at?: string;

  // Configuration
  config?: Record<string, any>;

  // Timing
  created_at: string;
  updated_at: string;
}

export interface CreateInstanceN8NWorkflowRequest {
  instance_id: string;
  instance_number: string;
  workflow_id: string;
  workflow_name: string;
  webhook_url?: string;
  trigger_type?: N8NWorkflowTriggerType;
  config?: Record<string, any>;
}

export interface UpdateInstanceN8NWorkflowRequest {
  workflow_name?: string;
  webhook_url?: string;
  trigger_type?: N8NWorkflowTriggerType;
  is_active?: boolean;
  config?: Record<string, any>;
}

export interface InstanceWorkflowResponse {
  success: boolean;
  message: string;
  data?: InstanceN8NWorkflow;
  error?: string;
}

export interface InstanceWorkflowListResponse {
  success: boolean;
  data: InstanceN8NWorkflow[];
  count: number;
}

export interface TriggerWorkflowRequest {
  instance_number: string;
  workflow_id: string;
  payload?: Record<string, any>;
}

export interface WorkflowExecutionLog {
  id: string;
  workflow_id: string;
  instance_number: string;
  trigger_type: string;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  response?: Record<string, any>;
  error?: string;
  executed_at: string;
  duration_ms: number;
}
