package models

type Pagination struct {
	Limit  int64 `json:"limit"`
	Offset int64 `json:"offset"`
	Total  int64 `json:"total"`
}

type Paginated[T any] struct {
	Limit  int64
	Offset int64
	Total  int64
	Data   []T
}
