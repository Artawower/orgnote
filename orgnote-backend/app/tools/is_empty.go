package tools

func IsEmpty[T comparable](v *T) bool {
	if v == nil {
		return true
	}

	var zero T
	return *v == zero
}
