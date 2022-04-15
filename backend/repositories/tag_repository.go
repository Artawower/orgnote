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
