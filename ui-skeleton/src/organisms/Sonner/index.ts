export * from './Sonner';
export * from './sonner.variants';

// Re-export sonner's imperative `toast` helper (and `useSonner` hook) from
// the barrel so consumers fire toasts via `import { toast } from
// '@open-tomato/ui-skeleton'` rather than reaching into `sonner` directly.
//
// Re-exported via `export { ... } from 'sonner'` (instead of `const toast =
// sonnerToast`) so the emitted `.d.ts` points at sonner's declaration
// directly. `toast.promise` references the unexported
// `PromiseIExtendedResult` type — materialising the inferred type into a
// local const fails declaration emit with TS4023. The re-export form keeps
// the type reference indirect and avoids the leak.
export { toast, useSonner } from 'sonner';

export type {
  ExternalToast,
  ToastClassnames,
  ToastT,
  ToastToDismiss,
} from 'sonner';
