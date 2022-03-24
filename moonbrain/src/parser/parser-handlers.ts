// import { GreaterElementType, Keyword, PropertyDrawer } from 'uniorg';
// import { normalizeOrgValue } from './tools';

// const PROPERTY_ID = 'id';

// export const parseProperties = (c: PropertyDrawer): any =>
//   c.children.reduce<any>((properties, p) => {
//     if (p.key.toLowerCase() === PROPERTY_ID) {
//       properties.id = p.value;
//       return properties;
//     }
//     properties[p.key.toLowerCase()] = normalizeOrgValue(p.value);
//     return properties;
//   }, {});

// // export const parseKeyword = (c: Keyword): any => {
// //   return { [c.key]: normalizeOrgValue(c.value) };
// // };

// const handlers: { [key in GreaterElementType['type']]?: (data: GreaterElementType) => void } = {
//   'property-drawer': parseProperties,
// };
