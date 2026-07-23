import type { SessionDetail } from '../../data';

import { Button, Icon, Modal } from '@open-tomato/ui-components';

import { exportJsonl } from '../../data';

export interface ExportTranscriptModalProps {
  open: boolean;
  onClose: () => void;
  /** The session detail being exported. */
  detail: SessionDetail;
}

/**
 * ExportTranscriptModal — the Export transcript sub-route (spec:
 * UI-Sessions.md "Sub Page: Export transcript"): a sanitized, low-verbosity
 * JSONL of the session events — mostly metadata and summary. The spec
 * prefers a triggered download named after the session slug and falls back
 * to displaying raw JSONL; PoC has no download side effects, so this shows
 * the raw-JSONL fallback with a mock download action.
 */
export const ExportTranscriptModal = ({ open, onClose, detail }: ExportTranscriptModalProps) => {
  const jsonl = exportJsonl(detail);
  const lines = jsonl.split('\n').length;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow="Export transcript"
      title={`${detail.session.slug}.jsonl`}
      footerStatus={`${lines} lines · sanitized · low verbosity`}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            iconLeading={<Icon name="download" size={15} />}
            onClick={onClose}
          >
            Download
          </Button>
        </>
      )}
    >
      <pre className="m-0 max-h-[380px] overflow-auto whitespace-pre rounded-md border border-border-soft bg-surface-sunk p-3 font-mono text-[11.5px] leading-[1.7] text-fg1">
        {jsonl}
      </pre>
    </Modal>
  );
};

ExportTranscriptModal.displayName = 'ExportTranscriptModal';
