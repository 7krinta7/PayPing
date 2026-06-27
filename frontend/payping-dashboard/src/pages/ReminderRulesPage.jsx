import { useEffect, useState } from 'react';
import {
  listReminderRules,
  createReminderRule,
  updateReminderRule,
  deleteReminderRule,
} from '../services/reminderRuleService';
import ReminderRuleList from '../components/reminders/ReminderRuleList';
import ReminderRuleForm from '../components/reminders/ReminderRuleForm';
import ConfirmDialog from '../components/clients/ConfirmDialog';
import { formatApiError } from '../utils/errorMessage';
import './ReminderRulesPage.css';

const PLUS_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/**
 * Resolve a displayable name for a rule (used in the delete confirm
 * dialog). Falls back to a generic phrase when the rule has no name.
 */
function describeRuleForDelete(rule) {
  const name = typeof rule?.name === 'string' ? rule.name.trim() : '';
  return name || 'this reminder rule';
}

/**
 * ReminderRulesPage — dedicated CRUD page for ReminderRule records.
 *
 * Phase 8 extracted this surface from the Reminders dashboard so the
 * dashboard can focus on operational state (overview, recent activity,
 * upcoming queue) while rule management lives behind its own route.
 */
export default function ReminderRulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const refreshRules = async () => {
    const data = await listReminderRules();
    setRules(data);
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchRules() {
      try {
        setLoading(true);
        setError('');
        const data = await listReminderRules();
        if (!cancelled) setRules(data);
      } catch (err) {
        if (!cancelled) {
          setError(formatApiError(err, 'Failed to load reminder rules'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRules();
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async (payload) => {
    try {
      setSubmitting(true);
      setError('');
      await createReminderRule(payload);
      await refreshRules();
      setShowForm(false);
    } catch (err) {
      setError(formatApiError(err, 'Failed to create reminder rule'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (rule) => {
    setEditingRule(rule);
    setShowForm(false);
  };

  const handleUpdate = async (payload) => {
    if (!editingRule) return;
    const id = editingRule._id;
    try {
      setSubmitting(true);
      setError('');
      await updateReminderRule(id, payload);
      await refreshRules();
      setEditingRule(null);
    } catch (err) {
      setError(formatApiError(err, 'Failed to update reminder rule'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (rule) => {
    const id = rule._id;
    const next = !rule.enabled;
    // Optimistic flip — revert on failure.
    setRules((prev) =>
      prev.map((r) => (r._id === id ? { ...r, enabled: next } : r))
    );
    try {
      setTogglingId(id);
      await updateReminderRule(id, { enabled: next });
    } catch (err) {
      // Revert.
      setRules((prev) =>
        prev.map((r) => (r._id === id ? { ...r, enabled: rule.enabled } : r))
      );
      setError(formatApiError(err, 'Failed to update reminder rule'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteClick = (rule) => {
    setPendingDelete(rule);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete._id;
    try {
      setError('');
      setDeletingId(id);
      await deleteReminderRule(id);
      await refreshRules();
      setPendingDelete(null);
    } catch (err) {
      setError(formatApiError(err, 'Failed to delete reminder rule'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingRule(null);
  };

  const hasRules = rules.length > 0;
  const formOpen = showForm || Boolean(editingRule);

  return (
    <div className="reminders-page">
      {/* Page header — hidden while the form is open to avoid a
          duplicate header above the Create / Edit Rule screen. */}
      {!formOpen && (
        <section className="reminders-page-header">
          <div className="reminders-page-header-text">
            <p className="reminders-page-eyebrow">Workspace</p>
            <h1 className="reminders-page-title">Reminder Rules</h1>
            <p className="reminders-page-subtitle">
              Configure automated email reminders that fire before, on, or after an invoice's
              due date.
            </p>
          </div>
          <div className="reminders-page-header-actions">
            <button
              type="button"
              className="btn btn-primary reminders-page-add-btn"
              onClick={() => setShowForm(true)}
              disabled={formOpen}
            >
              {PLUS_ICON}
              New Rule
            </button>
          </div>
        </section>
      )}

      {showForm && (
        <ReminderRuleForm
          key="create"
          initialValues={{}}
          mode="create"
          onSubmit={handleCreate}
          onCancel={handleCancelForm}
          submitting={submitting}
        />
      )}

      {editingRule && (
        <ReminderRuleForm
          key={`edit-${editingRule._id}`}
          initialValues={editingRule}
          mode="edit"
          onSubmit={handleUpdate}
          onCancel={handleCancelForm}
          submitting={submitting}
        />
      )}

      {!formOpen && (
        <section className="reminders-table-card">
          <header className="reminders-table-card-header">
            <div className="reminders-table-card-header-text">
              <h2 className="reminders-table-card-title">All Reminder Rules</h2>
              <p className="reminders-table-card-subtitle">
                {loading
                  ? 'Loading your reminder rules…'
                  : hasRules
                    ? `${rules.length} ${rules.length === 1 ? 'rule' : 'rules'} in your workspace`
                    : 'Define when PayPing should email your clients about pending invoices.'}
              </p>
            </div>
          </header>

          <ReminderRuleList
            rules={rules}
            loading={loading}
            error={error}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onToggle={handleToggle}
            togglingId={togglingId}
            deletingId={deletingId}
          />
        </section>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete reminder rule"
        message={
          pendingDelete
            ? `Delete the "${describeRuleForDelete(pendingDelete)}" rule? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        busy={Boolean(deletingId)}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}