import { isTrue, asArray, isFileImage } from './tools';
const FILETAGS_DEVIDER = ':';
const createSelectionHandler = (middleware) => (content) => {
    const handleOrgNode = createNodeHandlers(middleware);
    const [chunks, nodes] = content.children.reduce(([chunks, previousNodes], content) => {
        const val = handleOrgNode(content);
        const [handledChunks, orgNode] = val;
        const newChunks = [...chunks, ...(handledChunks || [])];
        const newNodes = [...previousNodes, ...(orgNode ? [orgNode] : [])];
        return [newChunks, newNodes];
    }, [[], []]);
    return [chunks, { ...content, children: nodes }];
};
const headlineHandler = (content) => [
    {
        headings: [{ text: content.rawValue, level: content.level }],
    },
    content,
];
const keywordHandlers = {
    title: (content) => ({ title: content.value }),
    filetags: (content) => ({ tags: content.value.split(FILETAGS_DEVIDER).filter((v) => v) }),
    description: (content) => ({ description: content.value }),
};
const keywordHandler = (content) => [
    keywordHandlers[content.key.toLocaleLowerCase()]?.(content),
    content,
];
const combineRawTextFromChildren = (children) => children.reduce((entireRawText, currentChildren) => `${entireRawText}${currentChildren.value}`, '');
const linkTypeCategory = {
    id: 'internalLinks',
    https: 'externalLinks',
    http: 'externalLinks',
    file: 'file',
};
const linkHandler = (link) => {
    const linkType = linkTypeCategory[link.linkType];
    if (linkType === 'file' && isFileImage(link.path)) {
        return [{ images: [link.path] }, link];
    }
    if (linkType) {
        return [{ [linkType]: [{ name: combineRawTextFromChildren(link.children), url: link.rawLink }] }, link];
    }
    return [null, link];
};
const propertiesHandlers = {
    published: (property) => ({ published: isTrue(property.value) }),
    id: (property) => ({ id: property.value }),
    category: (property) => ({ category: property.value }),
};
const propertyHandler = (property) => [
    propertiesHandlers[property.key.toLocaleLowerCase()]?.(property),
    property,
];
const createNodeHandlers = (middleware) => (node) => {
    const handlers = {
        section: createSelectionHandler(middleware),
        'org-data': createSelectionHandler(middleware),
        headline: asArray(headlineHandler),
        keyword: asArray(keywordHandler),
        link: asArray(linkHandler),
        paragraph: createSelectionHandler(middleware),
        'property-drawer': createSelectionHandler(middleware),
        'node-property': asArray(propertyHandler),
    };
    const handler = handlers[node.type];
    const updatedNode = middleware?.(node) || node;
    return handler ? handler(updatedNode) : [[], updatedNode];
};
const newEmptyNote = () => {
    return {
        meta: {
            headings: [],
            tags: [],
            externalLinks: [],
            linkedArticles: [],
            images: [],
        },
    };
};
const buildMiddleware = (middlewareChains = []) => (orgNode) => middlewareChains.reduce((orgNode, currentChain) => currentChain(orgNode), orgNode);
export const collectNote = (content, middlewareChains = []) => {
    const middleware = buildMiddleware(middlewareChains);
    const handleOrgNode = createNodeHandlers(middleware);
    const [chunks, patchedOrgNode] = handleOrgNode(content);
    const note = chunks
        .filter((cn) => !!cn)
        .reduce((acc, cn) => {
        const headings = cn.headings ?? [];
        const tags = cn.tags ?? [];
        const externalLinks = cn.externalLinks ?? [];
        const internalLinks = cn.internalLinks ?? [];
        cn.images ??= [];
        acc.meta.headings = [...acc.meta.headings, ...headings];
        acc.meta.title ??= cn.title;
        acc.meta.category ??= cn.category;
        acc.meta.description ??= cn.description;
        acc.meta.published ??= cn.published;
        acc.meta.tags = [...acc.meta.tags, ...tags];
        acc.meta.externalLinks = [...acc.meta.externalLinks, ...externalLinks];
        acc.meta.linkedArticles = [...acc.meta.linkedArticles, ...internalLinks];
        acc.meta.images = [...acc.meta.images, ...cn.images];
        acc.id ??= cn.id;
        return acc;
    }, newEmptyNote());
    note.content = patchedOrgNode;
    return note;
};
//# sourceMappingURL=parser.js.map