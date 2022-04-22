package services

import (
	"fmt"
	"moonbrain/repositories"
)

type TagService struct {
	tagRepository *repositories.TagRepository
}

func NewTagService(tagRepository *repositories.TagRepository) *TagService {
	return &TagService{tagRepository: tagRepository}
}

func (t *TagService) GetTags() ([]string, error) {
	tags, err := t.tagRepository.GetAll()
	if err != nil {
		return nil, fmt.Errorf("tag service: get all tags: %s", err)
	}
	return tags, nil
}

func (t *TagService) CreateTags(tags []string) error {
	err := t.tagRepository.CreateTags(tags)
	if err != nil {
		return fmt.Errorf("tag service: create tags: %s", err)
	}
	return nil
}
