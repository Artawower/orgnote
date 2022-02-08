package repositories

import "moonbrain/models"

type ArticleRepository struct {
	fakeDb map[string]models.Article
}

func NewArticleRepository() *ArticleRepository {
	return &ArticleRepository{fakeDb: make(map[string]models.Article)}
}

func (a *ArticleRepository) GetArticles() ([]models.Article, error) {
	articles := []models.Article{}

	for _, article := range a.fakeDb {
		articles = append(articles, article)
	}

	return articles, nil
}

func (a *ArticleRepository) AddArticle(article models.Article) error {
	a.fakeDb[article.ID] = article
	return nil
}

func (a *ArticleRepository) UpdateArticle(article models.Article) error {
	a.fakeDb[article.ID] = article
	return nil
}

func (a *ArticleRepository) GetArticle(id string) (models.Article, error) {
	article, _ := a.fakeDb[id]

	return article, nil
}
