**Popover Inside Dialog**

Radix Dialog uses scroll locking to prevent background scroll. When a Popover portals to `document.body`, it sits outside the dialog subtree and its content may not scroll due to the lock.

We fixed this globally by providing a dialog-local portal container and having Popover use it by default. No per-component hacks or effects are required.

**How It Works**
- Dialog exposes its content element via a React context:
  - apps/webapp/src/components/ui/modal-container.tsx:1
  - apps/webapp/src/components/ui/dialog.tsx:1 (DialogContent sets the context provider)
- PopoverContent reads the context and portals into the dialog content when present; otherwise it falls back to the default portal target:
  - apps/webapp/src/components/ui/popover.tsx:1
- Z‑index of Popover content is raised (`z-[60]`) to ensure it layers above the dialog content and overlay.

**Usage**
- Use `Popover`, `PopoverTrigger`, and `PopoverContent` as usual. When rendered inside a `DialogContent`, scrolling works as expected because the content stays inside the dialog subtree.
- If you need to override the container manually, `PopoverContent` still accepts a `container` prop; otherwise, the dialog container is used automatically.

**Examples in This Repo**
- Multi-select categories: apps/webapp/src/components/combobox/CategoryMultiCombobox.tsx:1
- Single-select combobox (currency, etc.): apps/webapp/src/components/combobox/ResponsiveCombobox.tsx:1
- Dialog provider:
  - apps/webapp/src/components/ui/dialog.tsx:1
  - apps/webapp/src/components/ui/modal-container.tsx:1
- Popover that respects dialog container: apps/webapp/src/components/ui/popover.tsx:1

**Notes**
- This pattern avoids fragile `useEffect + querySelector` workarounds.
- For other overlay components (e.g., Menus, Tooltips) that portal, consider adopting the same container-context approach if you encounter similar scroll issues inside dialogs.

