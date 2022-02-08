package services

import (
	"moonbrain/models"
	"moonbrain/repositories"
)

type ArticleService struct {
	articleRepository *repositories.ArticleRepository
}

func NewArticleService(repositoriesRepository *repositories.ArticleRepository) *ArticleService {
	return &ArticleService{articleRepository: repositoriesRepository}
}

func (a *ArticleService) CreateArticle(article models.Article) error {
	err := a.articleRepository.AddArticle(article)
	if err != nil {
		return err
	}
	return nil
}

func (a *ArticleService) UpdateArticle(article models.Article) error {
	err := a.articleRepository.UpdateArticle(article)
	if err != nil {
		return err
	}
	return nil
}

func (a *ArticleService) GetArticles() ([]models.Article, error) {
	// TODO: real query
	return a.articleRepository.GetArticles()
}

func (a *ArticleService) GetArticle(id string) (models.Article, error) {
	return a.articleRepository.GetArticle(id)
}
