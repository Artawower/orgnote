import type { OrgNode, OrgRepeater } from 'org-mode-ast';
import { NodeType, findNextSibling, parse } from 'org-mode-ast';
import type { OrgPlanningSlot } from '../types';
import { formatOrgStamp } from '../shared/format-org-timestamp';
import { parseOrgPlanningDate } from '../shared/parse-org-stamp';
import { detachNode } from '../shared/detach-node';
import { buildLocalDate } from '../shared/build-local-date';

export type PlanningKind = 'SCHEDULED' | 'DEADLINE' | 'CLOSED';

const KEYWORD_BY_KIND: Record<PlanningKind, string> = {
  SCHEDULED: 'SCHEDULED:',
  DEADLINE: 'DEADLINE:',
  CLOSED: 'CLOSED:',
};

const CANONICAL_PLANNING_ORDER: Record<PlanningKind, number> = {
  CLOSED: 0,
  DEADLINE: 1,
  SCHEDULED: 2,
};

const sortPlanningEntries = <T extends { kind: PlanningKind }>(
  entries: T[]
): T[] =>
  [...entries].sort(
    (a, b) =>
      CANONICAL_PLANNING_ORDER[a.kind] - CANONICAL_PLANNING_ORDER[b.kind]
  );

const PLANNING_DEFAULTS: Record<
  PlanningKind,
  { active: boolean; withTime: boolean }
> = {
  SCHEDULED: { active: true, withTime: false },
  DEADLINE: { active: true, withTime: false },
  CLOSED: { active: false, withTime: true },
};

const findPlanningNode = (headline: OrgNode): OrgNode | undefined =>
  headline.section?.childrenList.find((n) => n.is(NodeType.Planning));

const findKeywordNode = (
  planning: OrgNode,
  kind: PlanningKind
): OrgNode | undefined =>
  planning.childrenList.find(
    (n) => n.is(NodeType.PlanningKeyword) && n.value === KEYWORD_BY_KIND[kind]
  );

const findDateAfterKeyword = (keywordNode: OrgNode): OrgNode | undefined =>
  findNextSibling(keywordNode, (n) =>
    n.is(NodeType.Date, NodeType.DateRange)
  ) ?? undefined;

const setDateStamp = (dateNode: OrgNode, stamp: string): void => {
  const children = dateNode.childrenList;
  if (children.length === 0) {
    dateNode.setValue(stamp);
    return;
  }
  const first = children[0];
  const last = children[children.length - 1];
  const open = stamp.charAt(0);
  const close = stamp.charAt(stamp.length - 1);
  const inner = stamp.slice(1, -1);
  const middle = children.filter((n) => n !== first && n !== last);

  if (first?.is(NodeType.Operator)) first.setValue(open);
  if (last && last !== first && last.is(NodeType.Operator))
    last.setValue(close);
  if (middle.length === 1) {
    middle[0]!.setValue(inner);
    return;
  }
  dateNode.setValue(stamp);
};

const buildPlanningNode = (
  entries: Array<{ kind: PlanningKind; stamp: string }>
): OrgNode => {
  if (entries.length === 0) {
    throw new Error('buildPlanningNode requires at least one entry');
  }
  const body = entries
    .map((e) => `${KEYWORD_BY_KIND[e.kind]} ${e.stamp}`)
    .join(' ');
  const root = parse(`* X\n${body}\n`);
  const headline = root.childrenList.find((n) => n.is(NodeType.Headline));
  const planning = headline?.section?.childrenList.find((n) =>
    n.is(NodeType.Planning)
  );
  if (!planning) {
    throw new Error(
      `buildPlanningNode: failed to parse Planning from ${JSON.stringify(body)}`
    );
  }
  detachNode(planning);
  return planning;
};

const collectPlanningEntries = (
  planning: OrgNode
): Array<{ kind: PlanningKind; stamp: string }> => {
  const entries: Array<{ kind: PlanningKind; stamp: string }> = [];
  const children = planning.childrenList;
  children.forEach((node, index) => {
    if (!node.is(NodeType.PlanningKeyword)) return;
    const kind = (Object.keys(KEYWORD_BY_KIND) as PlanningKind[]).find(
      (k) => KEYWORD_BY_KIND[k] === node.value
    );
    if (!kind) return;
    const dateNode = children
      .slice(index + 1)
      .find((n) => n.is(NodeType.Date, NodeType.DateRange));
    if (!dateNode) return;
    entries.push({ kind, stamp: dateNode.rawValue });
  });
  return entries;
};

const insertPlanningAtSectionStart = (
  headline: OrgNode,
  planning: OrgNode
): void => {
  const section = headline.section;
  if (!section) {
    throw new Error(
      'OrgPlanningSlot: cannot mutate planning on headline without a section'
    );
  }
  const existing = section.childrenList.slice();
  existing.forEach((c) => section.removeNode(c));
  section.addChild(planning);
  section.addChild(buildNewLineNode());
  existing.forEach((c) => {
    detachNode(c);
    section.addChild(c);
  });
};

const buildNewLineNode = (): OrgNode => {
  const root = parse('\n');
  const newLine = root.childrenList.find((n) => n.is(NodeType.NewLine));
  if (!newLine) {
    throw new Error('buildNewLineNode: failed to parse a NewLine');
  }
  detachNode(newLine);
  return newLine;
};

const replacePlanning = (headline: OrgNode, newPlanning: OrgNode): void => {
  const section = headline.section;
  if (!section) {
    throw new Error(
      'OrgPlanningSlot: cannot mutate planning on headline without a section'
    );
  }
  const existing = findPlanningNode(headline);
  if (!existing) {
    insertPlanningAtSectionStart(headline, newPlanning);
    return;
  }
  const oldChildren = existing.childrenList.slice();
  oldChildren.forEach((c) => existing.removeNode(c));
  const incomingChildren = newPlanning.childrenList.slice();
  incomingChildren.forEach((c) => {
    detachNode(c);
    existing.addChild(c);
  });
};

const removePlanning = (headline: OrgNode): void => {
  const section = headline.section;
  if (!section) return;
  const planning = findPlanningNode(headline);
  if (!planning) return;
  const trailingNewLine = section.childrenList.find(
    (n) => n.start === planning.end && n.is(NodeType.NewLine)
  );
  section.removeNode(planning);
  if (trailingNewLine) section.removeNode(trailingNewLine);
};

const lastDayOfMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

const addCalendarMonths = (date: Date, months: number): Date => {
  const target = new Date(date.getTime());
  const day = target.getDate();
  target.setDate(1);
  target.setMonth(target.getMonth() + months);
  target.setDate(
    Math.min(day, lastDayOfMonth(target.getFullYear(), target.getMonth()))
  );
  return target;
};

const addCalendarYears = (date: Date, years: number): Date => {
  const target = new Date(date.getTime());
  const month = target.getMonth();
  const day = target.getDate();
  target.setDate(1);
  target.setFullYear(target.getFullYear() + years);
  target.setMonth(month);
  target.setDate(
    Math.min(day, lastDayOfMonth(target.getFullYear(), target.getMonth()))
  );
  return target;
};

const stepDate = (date: Date, repeater: OrgRepeater): Date => {
  switch (repeater.unit) {
    case 'h':
      return new Date(date.getTime() + repeater.value * 3600 * 1000);
    case 'd':
      return new Date(date.getTime() + repeater.value * 86400 * 1000);
    case 'w':
      return new Date(date.getTime() + repeater.value * 7 * 86400 * 1000);
    case 'm':
      return addCalendarMonths(date, repeater.value);
    case 'y':
      return addCalendarYears(date, repeater.value);
  }
};

const stepDateBackward = (date: Date, repeater: OrgRepeater): Date => {
  switch (repeater.unit) {
    case 'h':
      return new Date(date.getTime() - repeater.value * 3600 * 1000);
    case 'd':
      return new Date(date.getTime() - repeater.value * 86400 * 1000);
    case 'w':
      return new Date(date.getTime() - repeater.value * 7 * 86400 * 1000);
    case 'm':
      return addCalendarMonths(date, -repeater.value);
    case 'y':
      return addCalendarYears(date, -repeater.value);
  }
};

const ADVANCE_SAFETY_LIMIT = 10000;

const advanceDateByRepeater = (
  date: Date,
  repeater: OrgRepeater,
  from: Date
): Date => {
  if (repeater.value <= 0) return new Date(date.getTime());
  if (repeater.type === '.+') return stepDate(from, repeater);
  let next = new Date(date.getTime());
  for (let step = 0; step < ADVANCE_SAFETY_LIMIT; step += 1) {
    if (next.getTime() > from.getTime()) return next;
    next = stepDate(next, repeater);
  }
  throw new Error(
    `OrgPlanningSlot.advanceRepeater: exceeded ${ADVANCE_SAFETY_LIMIT} steps; ` +
      `repeater ${JSON.stringify(repeater)} did not advance past ${from.toISOString()}`
  );
};

export const createPlanningSlot = (
  headline: OrgNode,
  kind: PlanningKind
): OrgPlanningSlot => {
  const readDateNode = (): OrgNode | undefined => {
    const planning = findPlanningNode(headline);
    if (!planning) return undefined;
    const keyword = findKeywordNode(planning, kind);
    if (!keyword) return undefined;
    return findDateAfterKeyword(keyword);
  };

  return {
    get value() {
      const dateNode = readDateNode();
      return dateNode ? parseOrgPlanningDate(dateNode.rawValue) : undefined;
    },
    set: (value, options = {}) => {
      const defaults = PLANNING_DEFAULTS[kind];
      const dateNode = readDateNode();
      const existingParsed = dateNode
        ? parseOrgPlanningDate(dateNode.rawValue)
        : undefined;

      const active =
        options.active ?? existingParsed?.active ?? defaults.active;
      const withTime =
        options.withTime ?? existingParsed?.hasTime ?? defaults.withTime;
      const repeater =
        options.repeater === null
          ? undefined
          : (options.repeater ?? existingParsed?.repeater);
      const warning =
        options.warning === null
          ? undefined
          : (options.warning ?? existingParsed?.warning);

      const stamp = formatOrgStamp(value, {
        active,
        withTime,
        repeater,
        warning,
      });

      if (dateNode) {
        setDateStamp(dateNode, stamp);
        return;
      }

      const planning = findPlanningNode(headline);
      const otherEntries = planning ? collectPlanningEntries(planning) : [];
      const newPlanning = buildPlanningNode(
        sortPlanningEntries([...otherEntries, { kind, stamp }])
      );
      replacePlanning(headline, newPlanning);
    },
    clear: () => {
      const planning = findPlanningNode(headline);
      if (!planning) return;
      const remaining = collectPlanningEntries(planning).filter(
        (e) => e.kind !== kind
      );
      if (remaining.length === 0) {
        removePlanning(headline);
        return;
      }
      replacePlanning(headline, buildPlanningNode(remaining));
    },
    advanceRepeater: (from) => {
      const dateNode = readDateNode();
      if (!dateNode) return false;
      const parsed = parseOrgPlanningDate(dateNode.rawValue);
      if (!parsed?.repeater) return false;
      const baseDate = buildLocalDate(parsed);
      const next = advanceDateByRepeater(baseDate, parsed.repeater, from);
      const stamp = formatOrgStamp(next, {
        active: parsed.active,
        withTime: parsed.hasTime,
        repeater: parsed.repeater,
        warning: parsed.warning,
      });
      setDateStamp(dateNode, stamp);
      return true;
    },
    rewindRepeater: () => {
      const dateNode = readDateNode();
      if (!dateNode) return false;
      const parsed = parseOrgPlanningDate(dateNode.rawValue);
      if (!parsed?.repeater) return false;
      const baseDate = buildLocalDate(parsed);
      const prev = stepDateBackward(baseDate, parsed.repeater);
      const stamp = formatOrgStamp(prev, {
        active: parsed.active,
        withTime: parsed.hasTime,
        repeater: parsed.repeater,
        warning: parsed.warning,
      });
      setDateStamp(dateNode, stamp);
      return true;
    },
  };
};
