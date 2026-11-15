import { expect, test } from 'vitest';
import { editOrgDocument } from '../edit-org-document';

test('setTitle_replacesText_afterKeyword', () => {
  const next = editOrgDocument('* TODO Old title\nBody\n', (doc) => {
    doc.headlineAt(0)?.setTitle('New title');
  });
  expect(next).toBe('* TODO New title\nBody\n');
});

test('setTitle_preservesKeywordPriorityAndTags', () => {
  const next = editOrgDocument(
    '* TODO [#A] Old title :work:\nBody\n',
    (doc) => {
      doc.headlineAt(0)?.setTitle('New title');
    }
  );
  expect(next).toBe('* TODO [#A] New title :work:\nBody\n');
});

test('setTitle_renamesHeadline_withoutKeyword', () => {
  const next = editOrgDocument('* Just a heading\n', (doc) => {
    doc.headlineAt(0)?.setTitle('Renamed');
  });
  expect(next).toBe('* Renamed\n');
});

test('setBody_replacesBody_afterPlanningAndPropertyDrawer', () => {
  const next = editOrgDocument(
    '* TODO Task\nSCHEDULED: <2026-05-13 Wed>\n:PROPERTIES:\n:STYLE: habit\n:END:\nOld body line\n',
    (doc) => {
      doc.headlineAt(0)?.setBody('New body line');
    }
  );
  expect(next).toBe(
    '* TODO Task\nSCHEDULED: <2026-05-13 Wed>\n:PROPERTIES:\n:STYLE: habit\n:END:\nNew body line\n'
  );
});

test('setBody_replacesBody_whenNoDrawers', () => {
  const next = editOrgDocument('* TODO Task\nOld body\nLine 2\n', (doc) => {
    doc.headlineAt(0)?.setBody('Replaced');
  });
  expect(next).toBe('* TODO Task\nReplaced\n');
});

test('setBody_clearsBody_whenEmptyString', () => {
  const next = editOrgDocument('* TODO Task\nOld body\n', (doc) => {
    doc.headlineAt(0)?.setBody('');
  });
  expect(next).toBe('* TODO Task\n');
});

test('propertiesGet_exposesEntries_fromPropertyDrawer', () => {
  editOrgDocument(
    '* TODO X\n:PROPERTIES:\n:STYLE: habit\n:CUSTOM_ID: abc\n:END:\n',
    (doc) => {
      const props = doc.headlineAt(0)?.properties;
      expect(props?.get('STYLE')).toBe('habit');
      expect(props?.get('CUSTOM_ID')).toBe('abc');
      expect(Object.keys(props?.entries ?? {}).sort()).toEqual([
        'CUSTOM_ID',
        'STYLE',
      ]);
    }
  );
});

test('propertiesGet_handlesSpecialChars_inPropertyKeys', () => {
  editOrgDocument(
    '* TODO X\n:PROPERTIES:\n:CUSTOM_ID: abc\n:LAST-REPEAT: 2026-05-13\n:V2_FLAG: on\n:END:\n',
    (doc) => {
      const props = doc.headlineAt(0)?.properties;
      expect(props?.get('CUSTOM_ID')).toBe('abc');
      expect(props?.get('LAST-REPEAT')).toBe('2026-05-13');
      expect(props?.get('V2_FLAG')).toBe('on');
    }
  );
});

test('propertiesGet_preservesEmptyValue_asEmptyString', () => {
  editOrgDocument(
    '* TODO X\n:PROPERTIES:\n:STYLE:\n:CUSTOM_ID: abc\n:END:\n',
    (doc) => {
      const props = doc.headlineAt(0)?.properties;
      expect(props?.get('STYLE')).toBe('');
      expect(props?.get('CUSTOM_ID')).toBe('abc');
      expect(props?.entries).toEqual({ STYLE: '', CUSTOM_ID: 'abc' });
    }
  );
});

test('propertiesGet_preservesMultiWordValues', () => {
  editOrgDocument(
    '* TODO X\n:PROPERTIES:\n:DESCRIPTION: hello world\n:END:\n',
    (doc) => {
      expect(doc.headlineAt(0)?.properties.get('DESCRIPTION')).toBe(
        'hello world'
      );
    }
  );
});

test('propertiesGet_returnsEmptyEntries_whenNoDrawer', () => {
  editOrgDocument('* TODO X\n', (doc) => {
    const props = doc.headlineAt(0)?.properties;
    expect(props?.entries).toEqual({});
    expect(props?.get('STYLE')).toBeUndefined();
  });
});
