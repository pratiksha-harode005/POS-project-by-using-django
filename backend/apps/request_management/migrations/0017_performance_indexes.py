from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Migration 0017: Add critical performance indexes.

    Root cause diagnosis:
    - ApprovalHistory queries (used by serializer SerializerMethodFields) were doing
      full table scans because no index existed on (request_id, action).
    - Every serializer SerializerMethodField calls approval_history.filter(action__in=[...])
      which causes a sequential scan on large tables.
    - PurchaseRequest list queries on status, department, created_by, assigned_team_lead
      were doing full table scans on unindexed columns.

    These indexes are additive-only — no existing data is changed.
    """

    dependencies = [
        ('request_management', '0016_alter_purchaserequest_options_and_more'),
    ]

    operations = [
        # Composite index: (request_id, action) — the #1 most expensive missing index.
        # Every serializer SerializerMethodField calls obj.approval_history.filter(action__in=[...])
        # This turns O(n) full-table-scan into O(log n) index lookup.
        migrations.AddIndex(
            model_name='approvalhistory',
            index=models.Index(
                fields=['request', 'action'],
                name='approv_hist_req_action_idx'
            ),
        ),
        # Index on action alone for list-level audit filters
        migrations.AddIndex(
            model_name='approvalhistory',
            index=models.Index(
                fields=['action'],
                name='approv_hist_action_idx'
            ),
        ),
        # Composite index on PurchaseRequest(status, created_at DESC) — every portal
        # list query filters by status and orders by created_at
        migrations.AddIndex(
            model_name='purchaserequest',
            index=models.Index(
                fields=['status', 'created_at'],
                name='pr_status_created_idx'
            ),
        ),
        # Index on current_approval_level — used in role-based portal filtering
        migrations.AddIndex(
            model_name='purchaserequest',
            index=models.Index(
                fields=['current_approval_level'],
                name='pr_approval_level_idx'
            ),
        ),
        # Composite index on (department, status) — department-scoped portal queries
        migrations.AddIndex(
            model_name='purchaserequest',
            index=models.Index(
                fields=['department', 'status'],
                name='pr_dept_status_idx'
            ),
        ),
        # Index on created_by — used in EMPLOYEE/TEAM_LEAD role filtering
        migrations.AddIndex(
            model_name='purchaserequest',
            index=models.Index(
                fields=['created_by'],
                name='pr_created_by_idx'
            ),
        ),
        # Index on assigned_team_lead — used in TeamLead portal filtering
        migrations.AddIndex(
            model_name='purchaserequest',
            index=models.Index(
                fields=['assigned_team_lead'],
                name='pr_assigned_tl_idx'
            ),
        ),
    ]
