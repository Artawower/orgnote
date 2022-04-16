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
