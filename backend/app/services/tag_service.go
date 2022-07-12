package services

import (
	"fmt"
	"moonbrain/app/repositories"

	"github.com/rs/zerolog/log"
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
	log.Info().Msgf("tag service: create tags: %v", tags)
	err := t.tagRepository.BulkUpsert(tags)
	if err != nil {
		return fmt.Errorf("tag service: create tags: %s", err)
	}
	return nil
}
