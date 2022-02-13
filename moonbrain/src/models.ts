export interface ArticleMeta {
  previewImg?: string;
  title: string;
  description?: string;
  active?: boolean;
  headings: string[];
  // TODO: termporary string
  linkedArticles: string[];
  // TODO: think about whether this properties is needed
  properties?: string;
  externalLinks?: string[];
}

export interface LinkedArticle {
  id: string;
  title: string;
}

export interface Article {
  id: string;
  meta: ArticleMeta;
  content: any;
}
