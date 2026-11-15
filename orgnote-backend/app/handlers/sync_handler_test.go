package handlers

import (
	"testing"
)

type TestStruct struct {
	Path string `validate:"filepath"`
}

func TestValidateFilePath_Valid(t *testing.T) {
	v := NewValidator()

	tests := []string{
		"notes/my-note.org",
		"folder/subfolder/note.org",
		"readme.md",
		"notes/my.note.org",
		"заметки/файл.org",
		"programming/rust/Rust. Borrowing..org",
		"programming/rust/Rust. Type alias..org",
		"notes/file..org",
		"notes/some..thing.org",
		"notes/file...txt",
		"notes/Mr.. Smith.org",
	}

	for _, path := range tests {
		s := TestStruct{Path: path}
		errs := v.Validate(s)
		if len(errs) > 0 {
			t.Errorf("validateFilePath(%q) unexpected error: %v", path, errs)
		}
	}
}

func TestValidateFilePath_Invalid(t *testing.T) {
	v := NewValidator()

	tests := []struct {
		path string
		desc string
	}{
		{"", "empty path"},
		{"notes/../secret/file.org", "path traversal with parent reference"},
		{"../secret/file.org", "path traversal at start"},
		{"notes/folder/..", "path traversal as last segment"},
		{"..", "bare path traversal"},
		{"notes/CON.txt", "windows reserved CON"},
		{"PRN/file.org", "windows reserved PRN"},
		{"folder/NUL", "windows reserved NUL"},
		{"COM1.org", "windows reserved COM1"},
		{"notes/LPT1.txt", "windows reserved LPT1"},
		{"notes//file.org", "empty segment"},
	}

	for _, tt := range tests {
		s := TestStruct{Path: tt.path}
		errs := v.Validate(s)
		if len(errs) == 0 {
			t.Errorf("validateFilePath(%q) expected error for %s", tt.path, tt.desc)
		}
	}
}
