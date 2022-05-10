import { isFileImage, isFileNameContainUuid, isOrgFile, isTrue, normalizeStringValue } from './tools';
import { v4 as uuid } from 'uuid';

describe('Tools test', () => {
  it('Should collect true value from org string', () => {
    expect(isTrue('yes')).toEqual(true);
    expect(isTrue('true')).toEqual(true);
    expect(isTrue('    true   ')).toEqual(true);
    expect(isTrue('    yes  ')).toEqual(true);
  });

  it('Should collect false value from org string', () => {
    expect(isTrue('yes some text')).toEqual(false);
    expect(isTrue('tetrue')).toEqual(false);
    expect(isTrue('')).toEqual(false);
    expect(isTrue('1')).toEqual(false);
  });

  it('Should normalize org text', () => {
    expect(normalizeStringValue('   some text with BIG WORDs   ')).toEqual('some text with big words');
  });

  it('Should not change normal string after normalization', () => {
    expect(normalizeStringValue('text should not be normalized')).toEqual('text should not be normalized');
  });

  it('Should normalize upper case text', () => {
    expect(normalizeStringValue('TEXT SHOULD NOT BE NORMALIZED')).toEqual('text should not be normalized');
  });

  it('Should preserve empty string after normalization', () => {
    expect(normalizeStringValue('')).toEqual('');
  });

  fit('Should correct determine image files', () => {
    expect(isFileImage('file_name.jpg')).toEqual(true);
    expect(isFileImage('../file_name.jpg')).toEqual(true);
    expect(isFileImage('myimage.some-info.webp')).toEqual(true);
    expect(isFileImage('img.svg')).toEqual(true);
    expect(isFileImage('./img.svg')).toEqual(true);
    expect(isFileImage('anotherImage.bmp')).toEqual(true);
    expect(isFileImage('_.gif')).toEqual(true);
    expect(isFileImage('sm.jpeg')).toEqual(true);
  });

  it('Should not determine file as image', () => {
    expect(isFileImage('jpeg.avi')).toEqual(false);
    expect(isFileImage('another_file')).toEqual(false);
    expect(isFileImage('not.png.ext')).toEqual(false);
    expect(isFileImage('')).toEqual(false);
    expect(isFileImage('./file.mp4')).toEqual(false);
  });
});

describe('File name container uuid checker', () => {
  it('Should contain uuid4', () => {
    expect(isFileNameContainUuid(`./my-file${uuid()}.jpg`)).toBe(true);
    expect(isFileNameContainUuid(`./long-path/my-file${uuid()}.png`)).toBe(true);
    expect(isFileNameContainUuid(`./long-path/my-file${uuid()}.webp`)).toBe(true);
    expect(isFileNameContainUuid(`./long-path/my-file${uuid()}another-info.not-ext.txt`)).toBe(true);
    expect(isFileNameContainUuid(`./long-path/longer/another.file-${uuid()}`)).toBe(true);
  });

  it('Should not contain uuid4', () => {
    expect(isFileNameContainUuid(`./my-file.jpg`)).toBe(false);
    expect(isFileNameContainUuid(`./long-path/my-file.png`)).toBe(false);
    expect(isFileNameContainUuid(`./long-path/my-file.webp`)).toBe(false);
    expect(isFileNameContainUuid(`./long-path/my-file.not-ext.txt`)).toBe(false);
    expect(isFileNameContainUuid(`./long-path/longer/another.file`)).toBe(false);
    expect(isFileNameContainUuid(`./${uuid()}/longer/another.jpg`)).toBe(false);
    expect(isFileNameContainUuid(`../root/${uuid()}/another.png`)).toBe(false);
  });
});

describe('Org file checker', () => {
  it('Should identify file name as org file', () => {
    expect(isOrgFile('somefile.org')).toBe(true);
    expect(isOrgFile('./lonng-path/nested/path/myFile.org')).toBe(true);
    expect(isOrgFile('../path/myFile.org')).toBe(true);
  });

  it('Should not identify file name as org file', () => {
    expect(isOrgFile('.DS_Store')).toBe(false);
    expect(isOrgFile('./lonng-path/myFile.or')).toBe(false);
    expect(isOrgFile('../path/org.test')).toBe(false);
    expect(isOrgFile('org')).toBe(false);
  });
});
