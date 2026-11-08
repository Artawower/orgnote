import { api } from 'src/boot/api';
import { appendClock } from '../mutations/clock';
import { applyAgendaFileMutation } from './apply-agenda-file-mutation';
import { resolveContentInsertion, type ContentInsertion } from './content-insertion';
import type { ActiveSession } from './pomodoro-session';

export interface ClockWriteResult {
  wasWritten: boolean;
  insertion: ContentInsertion | null;
}

export const writeSessionClock = async (
  session: ActiveSession,
  endedAt: Date,
): Promise<ClockWriteResult> => {
  const result = await applyAgendaFileMutation(api, session.filePath, (content) =>
    appendClock(content, session.taskStart, new Date(session.segmentStartedAt), endedAt),
  );
  if (!result.wasWritten) return { wasWritten: false, insertion: null };
  return {
    wasWritten: true,
    insertion: resolveContentInsertion(result.previousContent, result.content),
  };
};
