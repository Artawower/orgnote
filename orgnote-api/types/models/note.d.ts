import type { ModelsPublicNote, ModelsPublicUser } from '../remote-api';
export interface NotesFilter {
    searchText?: string;
    userId?: string;
    limit?: number;
    offset?: number;
}
export interface NotePreview {
    id: ModelsPublicNote['id'];
    meta: ModelsPublicNote['meta'];
    createdAt: ModelsPublicNote['createdAt'];
    updatedAt: ModelsPublicNote['updatedAt'];
    filePath: ModelsPublicNote['filePath'];
    isMy: ModelsPublicNote['isMy'];
    author?: ModelsPublicUser;
    bookmarked?: boolean;
}
export interface Note extends ModelsPublicNote {
    deleted?: Date;
    bookmarked?: boolean;
}
