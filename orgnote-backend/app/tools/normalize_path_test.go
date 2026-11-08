package tools

import "testing"

func TestNormalizeFilePath(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "already starts with slash",
			input:    "/foo/bar",
			expected: "/foo/bar",
		},
		{
			name:     "does not start with slash",
			input:    "foo/bar",
			expected: "/foo/bar",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "/",
		},
		{
			name:     "only slash",
			input:    "/",
			expected: "/",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := NormalizeFilePath(tt.input); got != tt.expected {
				t.Errorf("NormalizeFilePath() = %v, want %v", got, tt.expected)
			}
		})
	}
}
