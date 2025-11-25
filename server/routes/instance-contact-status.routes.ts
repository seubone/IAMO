/**
 * Instance Contact Status Routes
 * API endpoints for managing contact pause and inactive status per instance
 */

import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { InstanceContactStatusService } from "../services/instance-contact-status";
import type {
  PauseContactRequest,
  DeactivateContactRequest,
  ContactStatusResponse,
  ContactStatusListResponse,
  ContactStatsResponse,
  BulkCreateContactsRequest,
} from "../../shared/instance-contact-status.types";

const router = Router();

/**
 * GET /api/instances/:instanceNumber/contacts
 * Get all contacts with their status for an instance
 */
router.get("/:instanceNumber/contacts", authMiddleware, async (req, res) => {
  try {
    const { instanceNumber } = req.params;

    if (!instanceNumber) {
      return res.status(400).json({
        success: false,
        message: "Número da instância é obrigatório",
        data: [],
        count: 0,
      } as ContactStatusListResponse);
    }

    const contacts =
      await InstanceContactStatusService.getInstanceContacts(instanceNumber);

    return res.json({
      success: true,
      message: "Contatos carregados com sucesso",
      data: contacts,
      count: contacts.length,
    } as ContactStatusListResponse);
  } catch (error: any) {
    console.error("[contact-status-routes] Erro ao obter contatos:", error);
    return res.status(500).json({
      success: false,
      message: "Falha ao obter contatos",
      data: [],
      count: 0,
      error: error.message,
    } as ContactStatusListResponse);
  }
});

/**
 * GET /api/instances/:instanceNumber/contacts/:contactJid
 * Get status for a specific contact
 */
router.get(
  "/:instanceNumber/contacts/:contactJid",
  authMiddleware,
  async (req, res) => {
    try {
      const { instanceNumber, contactJid } = req.params;

      if (!instanceNumber || !contactJid) {
        return res.status(400).json({
          success: false,
          message: "Número da instância e JID do contato são obrigatórios",
        } as ContactStatusResponse);
      }

      const status =
        await InstanceContactStatusService.getContactStatus(
          instanceNumber,
          contactJid
        );

      if (!status) {
        return res.status(404).json({
          success: false,
          message: "Contato não encontrado",
        } as ContactStatusResponse);
      }

      return res.json({
        success: true,
        message: "Status do contato obtido com sucesso",
        data: status,
      } as ContactStatusResponse);
    } catch (error: any) {
      console.error(
        "[contact-status-routes] Erro ao obter status do contato:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Falha ao obter status do contato",
        error: error.message,
      } as ContactStatusResponse);
    }
  }
);

/**
 * GET /api/instances/:instanceNumber/contacts/stats
 * Get statistics for contacts (active, paused, inactive counts)
 */
router.get("/:instanceNumber/contacts/stats", authMiddleware, async (req, res) => {
  try {
    const { instanceNumber } = req.params;

    if (!instanceNumber) {
      return res.status(400).json({
        success: false,
        message: "Número da instância é obrigatório",
      } as ContactStatsResponse);
    }

    const stats =
      await InstanceContactStatusService.getContactStats(instanceNumber);

    return res.json({
      success: true,
      message: "Estatísticas obtidas com sucesso",
      data: stats,
    } as ContactStatsResponse);
  } catch (error: any) {
    console.error(
      "[contact-status-routes] Erro ao obter estatísticas:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Falha ao obter estatísticas",
      error: error.message,
    } as ContactStatsResponse);
  }
});

/**
 * POST /api/instances/:instanceNumber/contacts/:contactJid/pause
 * Pause a contact
 */
router.post(
  "/:instanceNumber/contacts/:contactJid/pause",
  authMiddleware,
  async (req, res) => {
    try {
      const { instanceNumber, contactJid } = req.params;
      const { duration, reason } = req.body as PauseContactRequest;

      if (!instanceNumber || !contactJid) {
        return res.status(400).json({
          success: false,
          message: "Número da instância e JID do contato são obrigatórios",
        } as ContactStatusResponse);
      }

      const status = await InstanceContactStatusService.pauseContact(
        instanceNumber,
        contactJid,
        duration ?? null,
        reason || "Pausado pelo usuário"
      );

      return res.json({
        success: true,
        message: `Contato pausado com sucesso${
          duration ? ` por ${duration / 1000}s` : " indefinidamente"
        }`,
        data: status,
      } as ContactStatusResponse);
    } catch (error: any) {
      console.error(
        "[contact-status-routes] Erro ao pausar contato:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Falha ao pausar contato",
        error: error.message,
      } as ContactStatusResponse);
    }
  }
);

/**
 * POST /api/instances/:instanceNumber/contacts/:contactJid/resume
 * Resume a paused contact
 */
router.post(
  "/:instanceNumber/contacts/:contactJid/resume",
  authMiddleware,
  async (req, res) => {
    try {
      const { instanceNumber, contactJid } = req.params;

      if (!instanceNumber || !contactJid) {
        return res.status(400).json({
          success: false,
          message: "Número da instância e JID do contato são obrigatórios",
        } as ContactStatusResponse);
      }

      const status = await InstanceContactStatusService.resumeContact(
        instanceNumber,
        contactJid
      );

      return res.json({
        success: true,
        message: "Contato retomado com sucesso",
        data: status,
      } as ContactStatusResponse);
    } catch (error: any) {
      console.error(
        "[contact-status-routes] Erro ao retomar contato:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Falha ao retomar contato",
        error: error.message,
      } as ContactStatusResponse);
    }
  }
);

/**
 * POST /api/instances/:instanceNumber/contacts/:contactJid/deactivate
 * Deactivate a contact
 */
router.post(
  "/:instanceNumber/contacts/:contactJid/deactivate",
  authMiddleware,
  async (req, res) => {
    try {
      const { instanceNumber, contactJid } = req.params;
      const { duration, reason } = req.body as DeactivateContactRequest;

      if (!instanceNumber || !contactJid) {
        return res.status(400).json({
          success: false,
          message: "Número da instância e JID do contato são obrigatórios",
        } as ContactStatusResponse);
      }

      const status = await InstanceContactStatusService.deactivateContact(
        instanceNumber,
        contactJid,
        duration ?? null,
        reason || "Desativado pelo usuário"
      );

      return res.json({
        success: true,
        message: `Contato desativado com sucesso${
          duration ? ` por ${duration / 1000}s` : " indefinidamente"
        }`,
        data: status,
      } as ContactStatusResponse);
    } catch (error: any) {
      console.error(
        "[contact-status-routes] Erro ao desativar contato:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Falha ao desativar contato",
        error: error.message,
      } as ContactStatusResponse);
    }
  }
);

/**
 * POST /api/instances/:instanceNumber/contacts/:contactJid/activate
 * Activate a contact
 */
router.post(
  "/:instanceNumber/contacts/:contactJid/activate",
  authMiddleware,
  async (req, res) => {
    try {
      const { instanceNumber, contactJid } = req.params;

      if (!instanceNumber || !contactJid) {
        return res.status(400).json({
          success: false,
          message: "Número da instância e JID do contato são obrigatórios",
        } as ContactStatusResponse);
      }

      const status = await InstanceContactStatusService.activateContact(
        instanceNumber,
        contactJid
      );

      return res.json({
        success: true,
        message: "Contato ativado com sucesso",
        data: status,
      } as ContactStatusResponse);
    } catch (error: any) {
      console.error(
        "[contact-status-routes] Erro ao ativar contato:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Falha ao ativar contato",
        error: error.message,
      } as ContactStatusResponse);
    }
  }
);

/**
 * GET /api/instances/:instanceNumber/contacts/paused
 * Get all paused contacts for an instance
 */
router.get(
  "/:instanceNumber/contacts/paused",
  authMiddleware,
  async (req, res) => {
    try {
      const { instanceNumber } = req.params;

      if (!instanceNumber) {
        return res.status(400).json({
          success: false,
          message: "Número da instância é obrigatório",
          data: [],
          count: 0,
        } as ContactStatusListResponse);
      }

      const paused =
        await InstanceContactStatusService.getPausedContacts(instanceNumber);

      return res.json({
        success: true,
        message: "Contatos pausados carregados com sucesso",
        data: paused,
        count: paused.length,
      } as ContactStatusListResponse);
    } catch (error: any) {
      console.error(
        "[contact-status-routes] Erro ao obter contatos pausados:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Falha ao obter contatos pausados",
        data: [],
        count: 0,
        error: error.message,
      } as ContactStatusListResponse);
    }
  }
);

/**
 * GET /api/instances/:instanceNumber/contacts/inactive
 * Get all inactive contacts for an instance
 */
router.get(
  "/:instanceNumber/contacts/inactive",
  authMiddleware,
  async (req, res) => {
    try {
      const { instanceNumber } = req.params;

      if (!instanceNumber) {
        return res.status(400).json({
          success: false,
          message: "Número da instância é obrigatório",
          data: [],
          count: 0,
        } as ContactStatusListResponse);
      }

      const inactive =
        await InstanceContactStatusService.getInactiveContacts(instanceNumber);

      return res.json({
        success: true,
        message: "Contatos inativos carregados com sucesso",
        data: inactive,
        count: inactive.length,
      } as ContactStatusListResponse);
    } catch (error: any) {
      console.error(
        "[contact-status-routes] Erro ao obter contatos inativos:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Falha ao obter contatos inativos",
        data: [],
        count: 0,
        error: error.message,
      } as ContactStatusListResponse);
    }
  }
);

/**
 * GET /api/instances/:instanceNumber/contacts/active
 * Get all active contacts for an instance
 */
router.get(
  "/:instanceNumber/contacts/active",
  authMiddleware,
  async (req, res) => {
    try {
      const { instanceNumber } = req.params;

      if (!instanceNumber) {
        return res.status(400).json({
          success: false,
          message: "Número da instância é obrigatório",
          data: [],
          count: 0,
        } as ContactStatusListResponse);
      }

      const active =
        await InstanceContactStatusService.getActiveContacts(instanceNumber);

      return res.json({
        success: true,
        message: "Contatos ativos carregados com sucesso",
        data: active,
        count: active.length,
      } as ContactStatusListResponse);
    } catch (error: any) {
      console.error(
        "[contact-status-routes] Erro ao obter contatos ativos:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Falha ao obter contatos ativos",
        data: [],
        count: 0,
        error: error.message,
      } as ContactStatusListResponse);
    }
  }
);

/**
 * POST /api/instances/:instanceNumber/contacts/bulk-create
 * Bulk create contacts for an instance
 */
router.post(
  "/:instanceNumber/contacts/bulk-create",
  authMiddleware,
  async (req, res) => {
    try {
      const { instanceNumber } = req.params;
      const { contacts } = req.body as BulkCreateContactsRequest;

      if (!instanceNumber || !Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Número da instância e lista de contatos são obrigatórios",
          data: [],
          count: 0,
        } as ContactStatusListResponse);
      }

      const created =
        await InstanceContactStatusService.bulkCreateContacts(
          instanceNumber,
          contacts
        );

      return res.status(201).json({
        success: true,
        message: `${created.length} contatos criados com sucesso`,
        data: created,
        count: created.length,
      } as ContactStatusListResponse);
    } catch (error: any) {
      console.error(
        "[contact-status-routes] Erro ao criar contatos em massa:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Falha ao criar contatos em massa",
        data: [],
        count: 0,
        error: error.message,
      } as ContactStatusListResponse);
    }
  }
);

export default router;
