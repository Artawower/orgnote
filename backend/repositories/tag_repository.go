package repositories

type TagRepository struct {
	fakeDb []string
}

func NewTagRepository() *TagRepository {
	return &TagRepository{
		fakeDb: []string{},
	}
}

func (t *TagRepository) GetAll() ([]string, error) {
	return t.fakeDb, nil
}

func (t *TagRepository) CreateTags(tags []string) error {
	t.fakeDb = append(t.fakeDb, tags...)
	return nil
}
