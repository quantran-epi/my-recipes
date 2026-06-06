# Quick Task 260606-nzc: Replace App Modals With Fast Modal

**Date:** 2026-06-06
**Task:** Replace app-wide declarative modals with the custom fast modal shell, fix nested modal stacking, then deploy.

## Plan

1. Upgrade the shared `@components/Modal` wrapper so existing `<Modal>` usages render through the fast modal shell.
2. Preserve common Ant Design modal props used in the app: `open`, `title`, `onCancel`, `onOk`, `footer`, `width`, `style`, `zIndex`, `destroyOnClose`, `closable`, button labels, and button props.
3. Add automatic z-index stacking to the fast overlay primitives so child modals appear above parent modals.
4. Keep `Modal.useModal()` delegated to Ant Design for existing confirm/prompt provider compatibility.
5. Build, deploy via `docs/deployment.md`, commit, and push.
