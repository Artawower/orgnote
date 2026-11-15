import type { FileMeta, FileTask } from 'orgnote-api';
import { expect, test } from 'vitest';
import { createTaskPredictions } from './task-predictions';

const createTask = (id: string, state: FileTask['state']): FileTask => ({
  id,
  kind: 'headline-todo',
  state,
  text: id,
});

const files: FileMeta[] = [
  { id: 'work', filePath: ['work.org'], tasks: [createTask('report', 'todo'), createTask('call', 'todo')] },
  { id: 'home', filePath: ['home.org'], tasks: [createTask('dishes', 'todo')] },
];

test('createTaskPredictions applies a predicted patch to the matching task only', () => {
  const predictions = createTaskPredictions();

  predictions.predict('report', { state: 'done' });
  const result = predictions.apply(files);

  expect(result[0]?.tasks?.map((task) => task.state)).toEqual(['done', 'todo']);
  expect(result[1]).toBe(files[1]);
});

test('createTaskPredictions keeps the latest prediction until every pending edit is released', () => {
  const predictions = createTaskPredictions();
  const releaseFirst = predictions.predict('report', { state: 'done' });
  const releaseSecond = predictions.predict('report', { state: 'todo' });

  releaseFirst();
  const stateWhileSecondPending = predictions.apply(files)[0]?.tasks?.[0]?.state;
  releaseSecond();

  expect(stateWhileSecondPending).toBe('todo');
  expect(predictions.apply(files)).toBe(files);
});
