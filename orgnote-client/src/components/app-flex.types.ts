import type { StyleSize } from 'orgnote-api';

export type AppFlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type AppFlexJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
export type AppFlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type AppFlexGap = StyleSize | ({} & string);
export type AppFlexTag = string | object;
