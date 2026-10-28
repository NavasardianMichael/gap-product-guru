import { type ChangeEvent, type FC, useCallback, useState } from 'react';
import { FEEDBACK_NOTE_MAX_LENGTH } from '@gap-product-guru/shared';
import { Input, Modal, Typography } from 'antd';
import { CHAT_COPY, FEEDBACK_COPY } from '@/constants/chat';

type Props = {
  /** The note of an earlier report, so it can be edited. Read once — mount the modal to open it. */
  initialNote: string;
  onClose: () => void;
  /** Resolves to true when the report was saved (the modal then closes). */
  onSubmit: (note: string) => Promise<boolean>;
};

const NOTE_AUTO_SIZE = { minRows: 4, maxRows: 10 };

/** Mounted only while open, so each opening starts from the saved note. */
export const ReportModal: FC<Props> = ({ initialNote, onClose, onSubmit }) => {
  const [note, setNote] = useState(initialNote);
  const [isSending, setIsSending] = useState(false);

  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setNote(event.target.value);
  }, []);

  const handleOk = useCallback(async () => {
    setIsSending(true);
    const saved = await onSubmit(note);
    setIsSending(false);
    if (saved) onClose();
  }, [note, onClose, onSubmit]);

  return (
    <Modal
      open
      centered
      title={FEEDBACK_COPY.reportTitle}
      okText={FEEDBACK_COPY.sendReport}
      cancelText={CHAT_COPY.cancel}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={isSending}
    >
      <Typography.Paragraph type="secondary">{FEEDBACK_COPY.reportIntro}</Typography.Paragraph>
      <Input.TextArea
        value={note}
        onChange={handleChange}
        autoSize={NOTE_AUTO_SIZE}
        maxLength={FEEDBACK_NOTE_MAX_LENGTH}
        showCount
        placeholder={FEEDBACK_COPY.reportPlaceholder}
        aria-label={FEEDBACK_COPY.reportTitle}
        // antd draws the "0 / 2000" counter absolutely, 22px under the textarea — reserve that
        // space or the modal footer's buttons sit on top of it
        className="mb-6!"
      />
    </Modal>
  );
};
