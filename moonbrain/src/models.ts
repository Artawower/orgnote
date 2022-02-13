export interface ArticleProperties {
  active?: boolean;
  [key: string]: string | boolean | number;
}
export interface ArticleMeta {
  previewImg?: string;
  title: string;
  description?: string;
  active?: boolean;
  headings: string[];
  // TODO: temporary string
  linkedArticles: string[];
  // TODO: think about whether this properties is needed
  properties?: ArticleProperties;
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
